import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { TestTube, Send, MessageSquare, Phone, User, Calendar, Clock } from 'lucide-react';

interface Template {
  id: string;
  template_type: string;
  name: string;
  message: string;
  is_active: boolean;
}

const WhatsAppTest: React.FC = () => {
  const { barbershop } = useDashboard();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [testData, setTestData] = useState({
    cliente_nome: 'João Silva',
    data: '25/08/2025',
    horario: '14:30',
    servico: 'Corte + Barba',
    preco: '50,00',
    profissional: 'Carlos',
    barbearia_nome: barbershop?.name || 'Minha Barbearia',
    barbearia_endereco: barbershop?.address || 'Rua das Flores, 123'
  });
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

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
        .eq('is_active', true)
        .order('template_type');

      if (error) throw error;
      
      console.log('📋 Templates carregados:', data);
      
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const processarTemplate = (message: string, data: typeof testData): string => {
    let processedMessage = message;
    
    // Log para debug
    console.log('🔍 Processando template:', {
      originalMessage: message.substring(0, 100) + '...',
      data: data
    });
    
    // Mapeamento de variáveis antigas para novas
    const variableMap = {
      // Formato antigo (duplas chaves) para dados atuais
      '{{client_name}}': data.cliente_nome,
      '{{appointment_date}}': data.data,
      '{{appointment_time}}': data.horario,
      '{{service_name}}': data.servico,
      '{{service_price}}': data.preco,
      '{{barbershop_name}}': data.barbearia_nome,
      '{{barbershop_address}}': data.barbearia_endereco,
      
      // Formato novo (chaves simples)
      '{cliente_nome}': data.cliente_nome,
      '{data}': data.data,
      '{horario}': data.horario,
      '{servico}': data.servico,
      '{preco}': data.preco,
      '{profissional}': data.profissional,
      '{barbearia_nome}': data.barbearia_nome,
      '{barbearia_endereco}': data.barbearia_endereco
    };
    
    // Processar todas as variáveis
    Object.entries(variableMap).forEach(([placeholder, value]) => {
      const beforeReplace = processedMessage;
      processedMessage = processedMessage.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      
      // Log cada substituição
      if (beforeReplace !== processedMessage) {
        console.log(`✅ Substituído: ${placeholder} → ${value}`);
      }
    });
    
    console.log('📤 Mensagem final:', processedMessage.substring(0, 200) + '...');
    
    return processedMessage;
  };

  const enviarMensagem = async (message: string) => {
    if (!phoneNumber.trim()) {
      setLastResult({ success: false, message: 'Por favor, informe o número do telefone' });
      return;
    }

    // Verificar se tem WhatsApp conectado
    const { data: whatsappSession } = await supabase
      .from('whatsapp_sessions')
      .select('instance_token, is_connected')
      .eq('barbershop_id', barbershop?.id)
      .single();

    if (!whatsappSession?.is_connected || !whatsappSession?.instance_token) {
      setLastResult({ 
        success: false, 
        message: 'WhatsApp não está conectado. Conecte primeiro na aba WhatsApp.' 
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      // Limpar número (remover caracteres especiais)
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // Adicionar código do país se não tiver
      const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

      console.log('📱 Enviando mensagem:', {
        number: finalNumber,
        message: message.substring(0, 100) + '...',
        token: whatsappSession.instance_token
      });

      const response = await fetch('https://hairfycombr.uazapi.com/send/text', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': whatsappSession.instance_token
        },
        body: JSON.stringify({
          number: finalNumber,
          text: message
        })
      });

      const result = await response.json();
      console.log('📤 Resposta do envio:', result);

      if (response.ok && result) {
        setLastResult({ 
          success: true, 
          message: `Mensagem enviada com sucesso para +${finalNumber}!` 
        });
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setLastResult({ 
        success: false, 
        message: `Erro ao enviar: ${error.message}` 
      });
    } finally {
      setSending(false);
    }
  };

  const enviarTemplate = () => {
    if (!selectedTemplate) return;
    
    console.log('🚀 Enviando template:', {
      templateName: selectedTemplate.name,
      originalMessage: selectedTemplate.message,
      testData: testData
    });
    
    const processedMessage = processarTemplate(selectedTemplate.message, testData);
    
    console.log('📨 Mensagem processada que será enviada:', processedMessage);
    
    enviarMensagem(processedMessage);
  };

  const enviarMensagemCustomizada = () => {
    if (!customMessage.trim()) {
      setLastResult({ success: false, message: 'Por favor, digite uma mensagem' });
      return;
    }
    enviarMensagem(customMessage);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return value;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <TestTube className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teste de Mensagens</h1>
            <p className="text-gray-600">Teste o envio de mensagens WhatsApp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações de Teste */}
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Número de Destino
              </h3>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: (11) 99999-9999 ou 11999999999
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Dados de Teste
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={testData.cliente_nome}
                    onChange={(e) => setTestData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                      type="text"
                      value={testData.data}
                      onChange={(e) => setTestData(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <input
                      type="text"
                      value={testData.horario}
                      onChange={(e) => setTestData(prev => ({ ...prev, horario: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                    <input
                      type="text"
                      value={testData.servico}
                      onChange={(e) => setTestData(prev => ({ ...prev, servico: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço</label>
                    <input
                      type="text"
                      value={testData.preco}
                      onChange={(e) => setTestData(prev => ({ ...prev, preco: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="50,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                  <input
                    type="text"
                    value={testData.profissional}
                    onChange={(e) => setTestData(prev => ({ ...prev, profissional: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Teste de Templates */}
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Testar Template
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Template</label>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = templates.find(t => t.id === e.target.value);
                      setSelectedTemplate(template || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview da Mensagem</label>
                    <div className="bg-white border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800">
                        {processarTemplate(selectedTemplate.message, testData)}
                      </pre>
                    </div>
                  </div>
                )}

                <button
                  onClick={enviarTemplate}
                  disabled={!selectedTemplate || sending}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? 'Enviando...' : 'Enviar Template'}</span>
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Mensagem Personalizada
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sua Mensagem</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={6}
                    placeholder="Digite sua mensagem personalizada aqui..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <button
                  onClick={enviarMensagemCustomizada}
                  disabled={!customMessage.trim() || sending}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>
              </div>
            </div>

            {/* Resultado do Envio */}
            {lastResult && (
              <div className={`border rounded-lg p-4 ${
                lastResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {lastResult.success ? (
                    <div className="h-5 w-5 text-green-600">✅</div>
                  ) : (
                    <div className="h-5 w-5 text-red-600">❌</div>
                  )}
                  <span className="font-medium">{lastResult.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTest;