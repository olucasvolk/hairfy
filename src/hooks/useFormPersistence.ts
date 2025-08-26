import { useEffect, useCallback } from 'react';

interface UseFormPersistenceOptions {
  key: string;
  data: any;
  enabled?: boolean;
}

export const useFormPersistence = ({ key, data, enabled = true }: UseFormPersistenceOptions) => {
  // Salvar dados no localStorage automaticamente
  const saveToStorage = useCallback(() => {
    if (!enabled) return;
    
    try {
      const dataToSave = {
        ...data,
        _timestamp: Date.now(),
        _url: window.location.pathname
      };
      localStorage.setItem(`form_${key}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Erro ao salvar formulário:', error);
    }
  }, [key, data, enabled]);

  // Recuperar dados do localStorage
  const loadFromStorage = useCallback(() => {
    if (!enabled) return null;
    
    try {
      const saved = localStorage.getItem(`form_${key}`);
      if (saved) {
        const parsedData = JSON.parse(saved);
        // Verificar se os dados não são muito antigos (1 hora)
        const isRecent = Date.now() - parsedData._timestamp < 3600000;
        const isSamePage = parsedData._url === window.location.pathname;
        
        if (isRecent && isSamePage) {
          const { _timestamp, _url, ...formData } = parsedData;
          return formData;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar formulário:', error);
    }
    return null;
  }, [key, enabled]);

  // Limpar dados salvos
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(`form_${key}`);
    } catch (error) {
      console.warn('Erro ao limpar formulário:', error);
    }
  }, [key]);

  // Salvar automaticamente quando dados mudarem
  useEffect(() => {
    if (enabled && data && Object.keys(data).length > 0) {
      const timeoutId = setTimeout(saveToStorage, 500); // Debounce de 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [data, saveToStorage, enabled]);

  return {
    loadFromStorage,
    clearStorage,
    saveToStorage
  };
};