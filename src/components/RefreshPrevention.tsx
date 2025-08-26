import { usePreventRefresh } from '../hooks/usePreventRefresh';

export const RefreshPrevention: React.FC = () => {
  // Ativar prevenção automaticamente sem interface
  usePreventRefresh({
    enabled: true,
    onVisibilityChange: (isVisible) => {
      // Log silencioso apenas para debug se necessário
      console.log(`[RefreshPrevention] Página ${isVisible ? 'visível' : 'oculta'}`);
    },
    onBeforeUnload: () => {
      console.log('[RefreshPrevention] Refresh automático prevenido');
    }
  });

  return null; // Componente invisível que funciona em background
};

export default RefreshPrevention;