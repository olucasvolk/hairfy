import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { MessageSquare, Save, TestTube, Clock, CheckCircle } from 'lucide-react';

interface Template {
  id?: string;
  barbershop_id: string;
  template_type: 'appointment_confirmed' | 'appointment_reminder';
  name: string;
  message: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const WhatsAppTemplates: React.FC = () => {
  const { barbershop } = useDashboard();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Templates padrão
  const defaultTemplates: Omit<Template, 'id' | 'barbershop_id' | 'created_at' | 'updated_at'>[] = [
    {
      template_type: 'appointment_confirmed',
      name: 'Agendamento Confirmado',
      message: `✅ *Agendamento Confirmado!*

Olá {cliente_nome}! 

Seu agendamento foi confirmado com sucesso:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Obrigado por escolher nossos serviços! 
Até breve! 😊`,
      is_active: true
    },
    {
      template_type: 'appointment_reminder',
      name: 'Lembrete de Agendamento',
      message: `⏰ *Lembrete de Agendamento*

Olá {cliente_nome}! 

Lembrando que você tem um agendamento *amanhã*:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.`,
      is_active: true
    }
  ];

  useEffect(() => {
    if (barbershop?.id) {
      carregarTemplates();
    }
  }, [barbershop?.id]);

  const carregarTemplates = async () => {
    if (!barbershop?.id) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('template_type');

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        // Criar templates padrão se não existirem
        await criarTemplatesPadrao();
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarTemplatesPadrao = async () => {
    if (!barbershop?.id) return;

    try {
      const templatesParaCriar = defaultTemplates.map(template => ({
        ...template,
        barbershop_id: barbershop.id
      }));

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert(templatesParaCriar)
        .select();

      if (error) throw error;

      if (data) {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Erro ao criar templates padrão:', error);
    }
  };

  const salvarTemplate = async (template: Template) => {
    if (!barbershop?.id) return;

    setSaving(template.template_type);

    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .upsert({
          ...template,
          barbershop_id: barbershop.id,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar template na lista
      setTemplates(prev => 
        prev.map(t => t.template_type === template.template_type ? data : t)
      );

      console.log('✅ Template salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    } finally {
      setSaving(null);
    }
  };

  const atualizarTemplate = (template_type: string, field: keyof Template, value: any) => {
    setTemplates(prev =>
      prev.map(template =>
        template.template_type === template_type
          ? { ...template, [field]: value }
          : template
      )
    );
  };

  const getTemplateIcon = (template_type: string) => {
    switch (template_type) {
      case 'appointment_confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'appointment_reminder':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTemplateColor = (template_type: string) => {
    switch (template_type) {
      case 'appointment_confirmed':
        return 'border-green-200 bg-green-50';
      case 'appointment_reminder':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando templates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates WhatsApp</h1>
            <p className="text-gray-600">Configure as mensagens automáticas enviadas aos clientes</p>
          </div>
        </div>

        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.template_type} className={`border rounded-lg p-6 ${getTemplateColor(template.template_type)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTemplateIcon(template.template_type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600">
                      {template.template_type === 'appointment_confirmed' 
                        ? 'Enviada imediatamente após confirmação do agendamento'
                        : 'Enviada 1 dia antes do agendamento'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={template.is_active}
                      onChange={(e) => atualizarTemplate(template.template_type, 'is_active', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Ativo</span>
                  </label>
                  
                  <button
                    onClick={() => salvarTemplate(template)}
                    disabled={saving === template.template_type}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving === template.template_type ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Template
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => atualizarTemplate(template.template_type, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome do template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={template.message}
                    onChange={(e) => atualizarTemplate(template.template_type, 'message', e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Digite sua mensagem aqui..."
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Variáveis Disponíveis:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{cliente_nome}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{data}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{horario}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{servico}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{preco}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{profissional}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{barbearia_nome}'}</code>
                    <code className="bg-gray-100 px-2 py-1 rounded">{'{barbearia_endereco}'}</code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplates;