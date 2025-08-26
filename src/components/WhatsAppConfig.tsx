import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, XCircle, RefreshCw, Settings, Send, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { io, Socket } from 'socket.io-client';

interface WhatsAppSession {
    id: string;
    phone_number?: string;
    is_connected: boolean;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    qr_code?: string;
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
    const [socket, setSocket] = useState<Socket | null>(null);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    
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
            setupSocket();
        }
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [barbershop?.id]);

    const setupSocket = () => {
        if (!barbershop?.id) return;

        // Use localhost:3001 in development, current origin in production
        const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
        const newSocket = io(socketUrl);
        setSocket(newSocket);

        // Escutar eventos do WhatsApp
        newSocket.on(`qr_${barbershop.id}`, (data) => {
            setQrCodeImage(data.qr);
            setSession(prev => ({ ...prev!, status: 'connecting' }));
        });

        newSocket.on(`ready_${barbershop.id}`, (data) => {
            setSession(prev => ({
                ...prev!,
                status: 'connected',
                is_connected: true,
                phone_number: `+${data.phone}`
            }));
            setQrCodeImage('');
            updateSessionInDatabase('connected', `+${data.phone}`);
        });

        newSocket.on(`authenticated_${barbershop.id}`, () => {
            console.log('WhatsApp autenticado');
        });

        newSocket.on(`auth_failure_${barbershop.id}`, (data) => {
            setSession(prev => ({ ...prev!, status: 'error' }));
            console.error('Falha na autenticação:', data.error);
        });

        newSocket.on(`disconnected_${barbershop.id}`, () => {
            setSession(prev => ({ ...prev!, status: 'disconnected', is_connected: false }));
            setQrCodeImage('');
            updateSessionInDatabase('disconnected');
        });
    };

    const startQRPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const interval = setInterval(async () => {
            if (!barbershop?.id) return;

            try {
                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
                
                // Check QR code
                const qrResponse = await fetch(`${baseUrl}/api/whatsapp/qr/${barbershop.id}`);
                const qrResult = await qrResponse.json();
                
                if (qrResult.qr) {
                    setQrCodeImage(qrResult.qr);
                    setSession(prev => ({ ...prev!, status: 'connecting' }));
                }

                // Check status
                const statusResponse = await fetch(`${baseUrl}/api/whatsapp/status/${barbershop.id}`);
                const statusResult = await statusResponse.json();
                
                if (statusResult.connected) {
                    setSession(prev => ({
                        ...prev!,
                        status: 'connected',
                        is_connected: true,
                        phone_number: statusResult.phone ? `+${statusResult.phone}` : prev?.phone_number
                    }));
                    setQrCodeImage('');
                    updateSessionInDatabase('connected', statusResult.phone ? `+${statusResult.phone}` : undefined);
                    clearInterval(interval);
                    setPollingInterval(null);
                }
            } catch (error) {
                console.error('Erro no polling:', error);
            }
        }, 2000); // Poll every 2 seconds

        setPollingInterval(interval);

        // Stop polling after 5 minutes
        setTimeout(() => {
            clearInterval(interval);
            setPollingInterval(null);
        }, 300000);
    };

    const fetchWhatsAppData = async () => {
        if (!barbershop?.id) return;

        try {
            // Buscar sessão do WhatsApp
            const { data: sessionData } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('barbershop_id', barbershop.id)
                .single();

            if (sessionData) {
                setSession(sessionData);
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
            console.error('Erro ao buscar dados do WhatsApp:', error);
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
            console.error('Erro ao atualizar sessão:', error);
        }
    };

    const handleConnect = async () => {
        if (!barbershop?.id) return;

        setLoading(true);
        try {
            // Use localhost:3001 in development
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
            const response = await fetch(`${baseUrl}/api/whatsapp/connect/${barbershop.id}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                if (result.message === 'Already connected') {
                    // Verificar status real
                    const statusResponse = await fetch(`${baseUrl}/api/whatsapp/status/${barbershop.id}`);
                    const statusResult = await statusResponse.json();
                    
                    if (statusResult.connected) {
                        setSession(prev => ({ 
                            ...prev!, 
                            status: 'connected', 
                            is_connected: true,
                            phone_number: statusResult.phone ? `+${statusResult.phone}` : prev?.phone_number
                        }));
                        updateSessionInDatabase('connected', statusResult.phone ? `+${statusResult.phone}` : undefined);
                    } else {
                        setSession(prev => ({ ...prev!, status: 'connecting' }));
                        // Start polling for QR code
                        startQRPolling();
                    }
                } else {
                    setSession(prev => ({ ...prev!, status: 'connecting' }));
                    // Start polling for QR code
                    startQRPolling();
                }
            } else {
                console.error('Erro ao conectar:', result.error);
            }
        } catch (error) {
            console.error('Erro ao conectar WhatsApp:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!barbershop?.id || !session) return;

        setLoading(true);
        try {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
            const response = await fetch(`${baseUrl}/api/whatsapp/disconnect/${barbershop.id}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                setSession(prev => prev ? { ...prev, is_connected: false, status: 'disconnected' } : null);
                setQrCodeImage('');
                updateSessionInDatabase('disconnected');
            }
        } catch (error) {
            console.error('Erro ao desconectar WhatsApp:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!barbershop?.id) return;

        if (!confirm('Tem certeza que deseja resetar a conexão WhatsApp? Isso irá limpar todos os dados de autenticação.')) return;

        setLoading(true);
        try {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
            const response = await fetch(`${baseUrl}/api/whatsapp/reset/${barbershop.id}`, {
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
            console.error('Erro ao resetar WhatsApp:', error);
            alert('Erro ao resetar WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone || !testMessage || !barbershop?.id) return;

        setTestLoading(true);
        try {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
            const response = await fetch(`${baseUrl}/api/whatsapp/send/${barbershop.id}`, {
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
                alert('Mensagem enviada com sucesso!');
                setTestPhone('');
                setTestMessage('');
            } else {
                alert(`Erro ao enviar mensagem: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de teste:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setTestLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!barbershop?.id || !templateForm.template_name || !templateForm.message_template) return;

        try {
            if (editingTemplate) {
                // Atualizar template existente
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
                // Criar novo template
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

            // Resetar form e recarregar templates
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
            console.error('Erro ao salvar template:', error);
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
            console.error('Erro ao excluir template:', error);
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
                            Status da Conexão
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
                        Número conectado: {session.phone_number}
                    </p>
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

                {qrCodeImage && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                            Escaneie o QR Code com seu WhatsApp
                        </h4>
                        <div className="flex justify-center">
                            <img 
                                src={qrCodeImage} 
                                alt="QR Code WhatsApp" 
                                className="w-64 h-64 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <p className="text-sm text-gray-600 mt-3 text-center">
                            Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
                        </p>
                    </div>
                )}

                {/* Debug Panel */}
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                        🔧 Debug Info
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Barbershop ID:</strong> {barbershop?.id}</p>
                        <p><strong>Session Status:</strong> {session?.status || 'null'}</p>
                        <p><strong>Is Connected:</strong> {session?.is_connected ? 'true' : 'false'}</p>
                        <p><strong>QR Code:</strong> {qrCodeImage ? 'Disponível' : 'Não disponível'}</p>
                        <p><strong>Socket:</strong> {socket?.connected ? 'Conectado' : 'Desconectado'}</p>
                        <p><strong>Polling:</strong> {pollingInterval ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                        <button
                            onClick={async () => {
                                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
                                const response = await fetch(`${baseUrl}/debug`);
                                const data = await response.json();
                                alert(JSON.stringify(data, null, 2));
                            }}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                            Ver Debug Server
                        </button>
                        <button
                            onClick={() => {
                                console.log('Session:', session);
                                console.log('QR Code:', qrCodeImage);
                                console.log('Socket:', socket);
                            }}
                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                        >
                            Log Console
                        </button>
                    </div>
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
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        template.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {template.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {template.template_type === 'confirmation' ? 'Confirmação' : 
                                         template.template_type === 'reminder' ? 'Lembrete' : 'Personalizado'}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm">{template.message_template}</p>
                            </div>
                            <div className="flex space-x-2 ml-4">
                                <button
                                    onClick={() => handleEditTemplate(template)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum template encontrado. Crie seu primeiro template!
                    </div>
                )}
            </div>
        </div>
    );

    const renderTestTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Enviar Mensagem de Teste
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número do WhatsApp
                        </label>
                        <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="Ex: +5511999999999"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mensagem
                        </label>
                        <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Digite sua mensagem de teste..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleSendTest}
                        disabled={!testPhone || !testMessage || testLoading || !session?.is_connected}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {testLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        <span>{testLoading ? 'Enviando...' : 'Enviar Teste'}</span>
                    </button>

                    {!session?.is_connected && (
                        <p className="text-sm text-amber-600">
                            ⚠️ WhatsApp deve estar conectado para enviar mensagens
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <MessageCircle className="w-8 h-8 text-green-600" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">WhatsApp</h2>
                    <p className="text-gray-600">Configure a integração com WhatsApp</p>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'connection', name: 'Conexão', icon: Smartphone },
                        { id: 'templates', name: 'Templates', icon: Settings },
                        { id: 'test', name: 'Teste', icon: Send }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'connection' && renderConnectionTab()}
                {activeTab === 'templates' && renderTemplatesTab()}
                {activeTab === 'test' && renderTestTab()}
            </motion.div>
        </div>
    );
};

export default WhatsAppConfig;