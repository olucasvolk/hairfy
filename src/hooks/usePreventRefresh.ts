import { useEffect, useRef, useCallback } from 'react';

interface UsePreventRefreshOptions {
  enabled?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  onBeforeUnload?: (event: BeforeUnloadEvent) => void;
}

export const usePreventRefresh = (options: UsePreventRefreshOptions = {}) => {
  const { enabled = true, onVisibilityChange, onBeforeUnload } = options;
  const lastVisibilityChange = useRef<number>(Date.now());
  const isVisible = useRef<boolean>(true);
  const preventRefresh = useRef<boolean>(true); // Sempre ativo

  // Função para comunicar com o service worker
  const sendMessageToSW = useCallback((message: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }, []);

  // Gerenciar mudanças de visibilidade
  const handleVisibilityChange = useCallback(() => {
    const nowVisible = !document.hidden;
    const now = Date.now();
    
    console.log('Visibility change:', { 
      wasVisible: isVisible.current, 
      nowVisible, 
      timeSinceLastChange: now - lastVisibilityChange.current 
    });

    // Atualizar referências
    isVisible.current = nowVisible;
    lastVisibilityChange.current = now;

    // Notificar service worker
    sendMessageToSW({
      type: 'VISIBILITY_CHANGE',
      isVisible: nowVisible,
      timestamp: now
    });

    // Callback personalizado
    if (onVisibilityChange) {
      onVisibilityChange(nowVisible);
    }
  }, [onVisibilityChange, sendMessageToSW]);

  // Prevenir refresh automático
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    const timeSinceLastChange = Date.now() - lastVisibilityChange.current;
    
    // Se a mudança de visibilidade foi muito recente, prevenir refresh
    if (preventRefresh.current && timeSinceLastChange < 3000) {
      console.log('Prevenindo refresh automático - mudança recente de visibilidade');
      event.preventDefault();
      event.returnValue = '';
      
      if (onBeforeUnload) {
        onBeforeUnload(event);
      }
      
      return '';
    }
  }, [onBeforeUnload]);

  // Prevenir refresh por teclas
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevenir F5 e Ctrl+R se necessário
    if (preventRefresh.current) {
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        const timeSinceLastChange = Date.now() - lastVisibilityChange.current;
        if (timeSinceLastChange < 2000) {
          console.log('Prevenindo refresh por tecla - mudança recente de visibilidade');
          event.preventDefault();
          return false;
        }
      }
    }
  }, []);

  // Gerenciar foco da janela
  const handleFocus = useCallback(() => {
    console.log('Janela ganhou foco');
    lastVisibilityChange.current = Date.now();
    
    sendMessageToSW({
      type: 'WINDOW_FOCUS',
      timestamp: Date.now()
    });
  }, [sendMessageToSW]);

  const handleBlur = useCallback(() => {
    console.log('Janela perdeu foco');
    lastVisibilityChange.current = Date.now();
    
    sendMessageToSW({
      type: 'WINDOW_BLUR',
      timestamp: Date.now()
    });
  }, [sendMessageToSW]);

  // Função para ativar/desativar prevenção
  const setPreventRefresh = useCallback((prevent: boolean) => {
    preventRefresh.current = prevent;
    sendMessageToSW({
      type: 'PREVENT_REFRESH',
      prevent
    });
    console.log('Prevenção de refresh:', prevent ? 'ativada' : 'desativada');
  }, [sendMessageToSW]);

  // Configurar event listeners
  useEffect(() => {
    // Configurar prevenção inicial
    setPreventRefresh(enabled);

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleVisibilityChange, handleBeforeUnload, handleFocus, handleBlur, handleKeyDown, setPreventRefresh]);

  return {
    setPreventRefresh,
    isVisible: isVisible.current,
    lastVisibilityChange: lastVisibilityChange.current
  };
};