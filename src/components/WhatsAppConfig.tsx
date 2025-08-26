import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, XCircle, RefreshCw, Settings, Send, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';

interface WhatsAppSession {
    id: string;
    phone_number?: string;
    is_connected: boolean;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    last_connected_at?: string;
}

interface WhatsAppTemplate {
    id: string;
    template_type: string;
    template_name: string;
    message_template: string;
    is_active: boolean;
}

const WhatsAppConfig: React.FC = () => {
    const { barbershop } = useDashboard();
    const [session, setSession] = useState<WhatsAppSession | null>(null);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [qrCodeImage, setQrCodeImage] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'connection' | 'templates' | 'test'>('connection');
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [connectPhone, setConnectPhone] = useState('');
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [pairCode, setPairCode] = useState('');
    
    // Template form states
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState({
        template_type: 'confirmation',
        template_name: '',
        message_template: '',
        is_active: true
    });

    useEffect(() => {
        if (barbershop?.id) {
            fetchWhatsAppData();
        }
    }, [barbershop?.id]);

    const fetchWhatsAppData = async () => {
        if (!barbershop?.id) return;

        try {
            // Verificar status real via UAZ API
            const statusResponse = await fetch(`/api/whatsapp/status/${barbershop.id}`);
            const serverStatus = await statusResponse.json();
            
            console.log('📱 Status UAZ API:', serverStatus);

            // Buscar sessão do banco
            const { data: sessionData } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('barbershop_id', barbershop.id)
                .single();

            // Usar status da UAZ API como verdade absoluta
            if (sessionData) {
                const realSession = {
                    ...sessionData,
                    is_connected: serverStatus.connected || false,
                    status: serverStatus.connected ? 'connected' : 'disconnected',
                    phone_number: serverStatus.phoneNumber || sessionData.phone_number
                };
                
                setSession(realSession);

                // Sincronizar banco com UAZ API se necessário
                if (sessionData.is_connected !== serverStatus.connected) {
                    await updateSessionInDatabase(
                        serverStatus.connected ? 'connected' : 'disconnected',
                        serverStatus.phoneNumber
                    );
                }
            } else if (serverStatus.connected) {
                // UAZ API conectada mas sem dados no banco
                const newSession = {
                    barbershop_id: barbershop.id,
                    is_connected: true,
                    status: 'connected',
                    phone_number: serverStatus.phoneNumber
                };
                setSession(newSession);
                await updateSessionInDatabase('connected', serverStatus.phoneNumber);
            }

            // Buscar templates
            const { data: templatesData } = await supabase
                .from('whatsapp_templates')
                .select('*')
                .eq('barbershop_id', barbershop.id)
                .order('template_type');

            if (templatesData) {
                setTemplates(templatesData);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados WhatsApp:', error);
        }
    };

    const updateSessionInDatabase = async (status: string, phoneNumber?: string) => {
        if (!barbershop?.id) return;

        try {
            const updateData: any = {
                status,
                is_connected: status === 'connected',
                last_connected_at: new Date().toISOString()
            };

            if (phoneNumber) {
                updateData.phone_number = phoneNumber;
            }

            await supabase
                .from('whatsapp_sessions')
                .upsert({
                    barbershop_id: barbershop.id,
                    ...updateData
                });
        } catch (error) {
            console.error('❌ Erro ao atualizar sessão:', error);
        }
    };

    const handleConnect = async () => {
        if (!barbershop?.id) return;

        // Se não tem número, mostrar input
        if (!connectPhone) {
            setShowPhoneInput(true);
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Conectando via UAZ API com número:', connectPhone);
            
            const response = await fetch(`/api/whatsapp/connect/${barbershop.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: connectPhone
                })
            });

            const result = await response.json();
            
            if (result.success) {
                if (result.connected) {
                    // Já conectado
                    setSession(prev => ({ 
                        ...prev!, 
                        status: 'connected', 
                        is_connected: true,
                        phone_number: result.phone
                    }));
                    updateSessionInDatabase('connected', result.phone);
                    setShowPhoneInput(false);
                } else {
                    // Iniciando conexão - mostrar QR Code e Pairing Code
                    setSession(prev => ({ ...prev!, status: 'connecting' }));
                    
                    if (result.qrcode) {
                        setQrCodeImage(result.qrcode);
                    }
                    
                    if (result.paircode) {
                        setPairCode(result.paircode);
                    }
                    
                    setShowPhoneInput(false);
                    await checkForConnection();
                }
            } else if (result.needsPhone) {
                setShowPhoneInput(true);
                alert(result.message || 'Número do telefone é obrigatório');
            } else {
                console.error('❌ Erro ao conectar:', result.error);
                alert(`Erro ao conectar: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Erro ao conectar WhatsApp:', error);
            alert('Erro ao conectar WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const checkForConnection = async () => {
        if (!barbershop?.id) return;

        let attempts = 0;
        const maxAttempts = 150; // 5 minutos (2 segundos * 150)

        const checkStatus = async () => {
            try {
                attempts++;
                
                // Verificar status da conexão
                const statusResponse = await fetch(`/api/whatsapp/status/${barbershop.id}`);
                const statusResult = await statusResponse.json();
                
                if (statusResult.connected) {
                    setSession(prev => ({
                        ...prev!,
                        status: 'connected',
                        is_connected: true,
                        phone_number: statusResult.phoneNumber
                    }));
                    setQrCodeImage('');
                    setPairCode('');
                    updateSessionInDatabase('connected', statusResult.phoneNumber);
                    return; // Parar verificação
                }

                // Atualizar QR Code e Pairing Code se disponíveis
                if (statusResult.qrcode) {
                    setQrCodeImage(statusResult.qrcode);
                }
                
                if (statusResult.paircode) {
                    setPairCode(statusResult.paircode);
                }

                // Continuar verificando se não atingiu limite
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000); // 3 segundos
                } else {
                    console.log('⏰ Timeout na verificação da conexão');
                    setSession(prev => ({ ...prev!, status: 'disconnected' }));
                    setQrCodeImage('');
                    setPairCode('');
                }
                
            } catch (error) {
                console.error('❌ Erro ao verificar status:', error);
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000);
                }
            }
        };

        checkStatus();
    };

    const handleDisconnect = async () => {
        if (!barbershop?.id || !session) return;

        setLoading(true);
        try {
            console.log('🔌 Desconectando via UAZ API...');
            
            const response = await fetch(`/api/whatsapp/disconnect/${barbershop.id}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                setSession(prev => prev ? { ...prev, is_connected: false, status: 'disconnected' } : null);
                setQrCodeImage('');
                updateSessionInDatabase('disconnected');
                alert('WhatsApp desconectado com sucesso!');
            } else {
                alert(`Erro ao desconectar: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Erro ao desconectar WhatsApp:', error);
            alert('Erro ao desconectar WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!barbershop?.id) return;

        if (!confirm('Tem certeza que deseja resetar a conexão WhatsApp? Isso irá limpar todos os dados de autenticação.')) return;

        setLoading(true);
        try {
            console.log('🔄 Resetando via UAZ API...');
            
            const response = await fetch(`/api/whatsapp/reset/${barbershop.id}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                setSession(prev => prev ? { ...prev, is_connected: false, status: 'disconnected' } : null);
                setQrCodeImage('');
                updateSessionInDatabase('disconnected');
                alert('Reset realizado com sucesso! Tente conectar novamente.');
            } else {
                alert(`Erro no reset: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Erro ao resetar WhatsApp:', error);
            alert('Erro ao resetar WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone || !testMessage || !barbershop?.id) return;

        setTestLoading(true);
        try {
            console.log('📤 Enviando mensagem teste via UAZ API...');
            
            const response = await fetch(`/api/whatsapp/send/${barbershop.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: testPhone,
                    message: testMessage
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Mensagem enviada com sucesso via UAZ API!');
                setTestPhone('');
                setTestMessage('');
            } else {
                alert(`Erro ao enviar mensagem: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem de teste:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setTestLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!barbershop?.id || !templateForm.template_name || !templateForm.message_template) return;

        try {
            if (editingTemplate) {
                const { error } = await supabase
                    .from('whatsapp_templates')
                    .update({
                        template_name: templateForm.template_name,
                        message_template: templateForm.message_template,
                        template_type: templateForm.template_type,
                        is_active: templateForm.is_active
                    })
                    .eq('id', editingTemplate.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('whatsapp_templates')
                    .insert({
                        barbershop_id: barbershop.id,
                        template_name: templateForm.template_name,
                        message_template: templateForm.message_template,
                        template_type: templateForm.template_type,
                        is_active: templateForm.is_active
                    });

                if (error) throw error;
            }

            setTemplateForm({
                template_type: 'confirmation',
                template_name: '',
                message_template: '',
                is_active: true
            });
            setEditingTemplate(null);
            setShowTemplateForm(false);
            fetchWhatsAppData();
        } catch (error) {
            console.error('❌ Erro ao salvar template:', error);
            alert('Erro ao salvar template');
        }
    };

    const handleEditTemplate = (template: WhatsAppTemplate) => {
        setEditingTemplate(template);
        setTemplateForm({
            template_type: template.template_type,
            template_name: template.template_name,
            message_template: template.message_template,
            is_active: template.is_active
        });
        setShowTemplateForm(true);
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Tem certeza que deseja excluir este template?')) return;

        try {
            const { error } = await supabase
                .from('whatsapp_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;
            fetchWhatsAppData();
        } catch (error) {
            console.error('❌ Erro ao excluir template:', error);
            alert('Erro ao excluir template');
        }
    };

    const renderConnectionTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                            session?.is_connected ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Status da Conexão UAZ API
                        </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        session?.is_connected 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {session?.is_connected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>

                {session?.phone_number && (
                    <p className="text-gray-600 mb-4">
                        📱 Número conectado: {session.phone_number}
                    </p>
                )}

                {/* Input do número do telefone */}
                {showPhoneInput && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                            📱 Informe seu número do WhatsApp
                        </h4>
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                value={connectPhone}
                                onChange={(e) => setConnectPhone(e.target.value)}
                                placeholder="11999999999"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleConnect}
                                disabled={loading || !connectPhone}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Conectar
                            </button>
                            <button
                                onClick={() => setShowPhoneInput(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Cancelar
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            Digite apenas números com DDD (ex: 11999999999)
                        </p>
                    </div>
                )}

                <div className="flex space-x-3">
                    {!session?.is_connected ? (
                        <button
                            onClick={handleConnect}
                            disabled={loading}
                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Smartphone className="w-4 h-4" />
                            )}
                            <span>{loading ? 'Conectando...' : 'Conectar WhatsApp'}</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4" />
                            <span>Desconectar</span>
                        </button>
                    )}
                    
                    <button
                        onClick={handleReset}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Reset</span>
                    </button>
                </div>

                {(qrCodeImage || pairCode) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                            📱 Conecte seu WhatsApp
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* QR Code */}
                            {qrCodeImage && (
                                <div className="text-center">
                                    <h5 className="font-medium text-gray-800 mb-2">Opção 1: QR Code</h5>
                                    <img 
                                        src={qrCodeImage} 
                                        alt="QR Code WhatsApp UAZ API" 
                                        className="w-48 h-48 mx-auto border border-gray-300 rounded-lg"
                                    />
                                    <p className="text-sm text-gray-600 mt-2">
                                        WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                                    </p>
                                </div>
                            )}
                            
                            {/* Pairing Code */}
                            {pairCode && (
                                <div className="text-center">
                                    <h5 className="font-medium text-gray-800 mb-2">Opção 2: Código de Pareamento</h5>
                                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                                        <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
                                            {pairCode}
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(pairCode)}
                                            className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded"
                                        >
                                            📋 Copiar Código
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">
                                        WhatsApp → Menu → Dispositivos conectados → Conectar com código do telefone
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 text-center">
                                ⏱️ Aguardando conexão... Use qualquer uma das opções acima
                            </p>
                        </div>
                    </div>
                )}

                {/* UAZ API Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                        🚀 UAZ API WhatsApp
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>✅ Serviço:</strong> UAZ API Profissional</p>
                        <p><strong>🔗 URL:</strong> https://hairfycombr.uazapi.com</p>
                        <p><strong>📱 Status:</strong> {session?.status || 'desconectado'}</p>
                        <p><strong>🔑 Autenticado:</strong> {session?.is_connected ? 'Sim' : 'Não'}</p>
                        <p><strong>📞 Telefone:</strong> {session?.phone_number || 'Não conectado'}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                        <button
                            onClick={fetchWhatsAppData}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                            🔄 Sincronizar
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch('/health');
                                    const data = await response.json();
                                    alert(JSON.stringify(data, null, 2));
                                } catch (error) {
                                    alert('Erro ao verificar health check');
                                }
                            }}
                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                        >
                            🏥 Health Check
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    console.log('🧪 Testando UAZ API...');
                                    const response = await fetch('/api/test-uaz');
                                    const data = await response.json();
                                    
                                    if (data.success) {
                                        alert(`✅ UAZ API funcionando!\n\n${JSON.stringify(data, null, 2)}`);
                                    } else {
                                        alert(`❌ UAZ API com problema:\n\n${JSON.stringify(data, null, 2)}`);
                                    }
                                } catch (error) {
                                    alert(`❌ Erro ao testar UAZ API: ${error.message}`);
                                }
                            }}
                            className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded"
                        >
                            🧪 Testar UAZ API
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTestTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Teste de Mensagem UAZ API
                </h3>
                
                {!session?.is_connected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-yellow-800">
                            ⚠️ WhatsApp não está conectado. Conecte primeiro na aba "Conexão".
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número do WhatsApp (com DDD)
                        </label>
                        <input
                            type="text"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="11999999999"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Digite apenas números (ex: 11999999999)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mensagem de Teste
                        </label>
                        <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Digite sua mensagem de teste aqui..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleSendTest}
                        disabled={testLoading || !session?.is_connected || !testPhone || !testMessage}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {testLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        <span>{testLoading ? 'Enviando...' : 'Enviar Teste'}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Templates de Mensagem</h3>
                <button
                    onClick={() => setShowTemplateForm(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Template</span>
                </button>
            </div>

            {showTemplateForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                        {editingTemplate ? 'Editar Template' : 'Novo Template'}
                    </h4>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo do Template
                            </label>
                            <select
                                value={templateForm.template_type}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, template_type: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="confirmation">Confirmação de Agendamento</option>
                                <option value="reminder">Lembrete de Agendamento</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nome do Template
                            </label>
                            <input
                                type="text"
                                value={templateForm.template_name}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, template_name: e.target.value }))}
                                placeholder="Ex: Confirmação Padrão"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mensagem do Template
                            </label>
                            <textarea
                                value={templateForm.message_template}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, message_template: e.target.value }))}
                                placeholder="Olá {{client_name}}, seu agendamento para {{service_name}} está confirmado para {{appointment_date}} às {{appointment_time}}."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Use variáveis: {{client_name}}, {{service_name}}, {{appointment_date}}, {{appointment_time}}, {{barbershop_name}}
                            </p>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={templateForm.is_active}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                Template ativo
                            </label>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleSaveTemplate}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                {editingTemplate ? 'Atualizar' : 'Salvar'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowTemplateForm(false);
                                    setEditingTemplate(null);
                                    setTemplateForm({
                                        template_type: 'confirmation',
                                        template_name: '',
                                        message_template: '',
                                        is_active: true
                                    });
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                                <span className="text-sm text-gray-500 capitalize">{template.template_type}</span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEditTemplate(template)}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.message_template}</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            template.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {template.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Configuração WhatsApp
                </h1>
                <p className="text-gray-600">
                    Configure e gerencie a integração WhatsApp via UAZ API
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { id: 'connection', label: 'Conexão', icon: MessageCircle },
                            { id: 'templates', label: 'Templates', icon: Settings },
                            { id: 'test', label: 'Teste', icon: Send }
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'connection' && renderConnectionTab()}
                    {activeTab === 'templates' && renderTemplatesTab()}
                    {activeTab === 'test' && renderTestTab()}
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConfig;