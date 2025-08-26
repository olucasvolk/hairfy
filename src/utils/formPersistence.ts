// Sistema de persistência automática de formulários
class FormPersistence {
  private static instance: FormPersistence;
  private observers: MutationObserver[] = [];
  private formStates: Map<string, any> = new Map();

  static getInstance(): FormPersistence {
    if (!FormPersistence.instance) {
      FormPersistence.instance = new FormPersistence();
    }
    return FormPersistence.instance;
  }

  init() {
    // Salvar estado quando a página fica oculta
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveAllForms();
      }
    });

    // Salvar antes de sair
    window.addEventListener('beforeunload', () => {
      this.saveAllForms();
    });

    // Observar novos formulários
    this.observeNewForms();
    
    // Restaurar formulários existentes
    setTimeout(() => this.restoreAllForms(), 500);
  }

  private observeNewForms() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const forms = element.querySelectorAll('form');
            forms.forEach((form) => this.attachFormListeners(form));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
  }

  private attachFormListeners(form: Element) {
    const formElement = form as HTMLFormElement;
    const formId = this.getFormId(formElement);

    // Salvar automaticamente quando campos mudam
    formElement.addEventListener('input', () => {
      this.saveForm(formElement, formId);
    });

    formElement.addEventListener('change', () => {
      this.saveForm(formElement, formId);
    });
  }

  private getFormId(form: HTMLFormElement): string {
    // Criar ID único baseado na URL e posição do form
    const url = window.location.pathname;
    const forms = Array.from(document.querySelectorAll('form'));
    const index = forms.indexOf(form);
    return `${url}_form_${index}`;
  }

  private saveForm(form: HTMLFormElement, formId: string) {
    try {
      const formData: Record<string, any> = {};
      
      // Capturar todos os inputs
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach((input) => {
        const element = input as HTMLInputElement;
        if (element.name) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            formData[element.name] = element.checked;
          } else {
            formData[element.name] = element.value;
          }
        }
      });

      // Salvar apenas se há dados
      if (Object.keys(formData).length > 0) {
        sessionStorage.setItem(formId, JSON.stringify({
          data: formData,
          timestamp: Date.now(),
          url: window.location.pathname
        }));
        console.log(`💾 Formulário salvo: ${formId}`);
      }
    } catch (error) {
      console.warn('Erro ao salvar formulário:', error);
    }
  }

  private saveAllForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      const formElement = form as HTMLFormElement;
      const formId = this.getFormId(formElement);
      this.saveForm(formElement, formId);
    });
  }

  private restoreAllForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      const formElement = form as HTMLFormElement;
      const formId = this.getFormId(formElement);
      this.restoreForm(formElement, formId);
    });
  }

  private restoreForm(form: HTMLFormElement, formId: string) {
    try {
      const saved = sessionStorage.getItem(formId);
      if (!saved) return;

      const { data, timestamp, url } = JSON.parse(saved);
      
      // Verificar se não é muito antigo (1 hora) e é da mesma página
      const isRecent = Date.now() - timestamp < 3600000;
      const isSamePage = url === window.location.pathname;
      
      if (!isRecent || !isSamePage) {
        sessionStorage.removeItem(formId);
        return;
      }

      // Restaurar valores
      Object.entries(data).forEach(([name, value]) => {
        const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
        if (input && input.value === '') {
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = value as boolean;
          } else {
            input.value = value as string;
          }
          
          // Disparar eventos para React detectar
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      console.log(`🔄 Formulário restaurado: ${formId}`);
    } catch (error) {
      console.warn('Erro ao restaurar formulário:', error);
    }
  }

  clearForm(formId: string) {
    sessionStorage.removeItem(formId);
  }

  clearAllForms() {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.includes('_form_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

// Inicializar automaticamente
const formPersistence = FormPersistence.getInstance();

// Exportar para uso manual se necessário
export { formPersistence };

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => formPersistence.init());
} else {
  formPersistence.init();
}