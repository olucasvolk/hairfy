import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, CheckCircle, XCircle, RefreshCw, Settings, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';

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

    useEffect(() => {
        if (barbershop?.id) {
            fetchWhatsAppData();
            setupSocket();
        }
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [barbershop?.id]);

    const setupSocket = () => {
        if (!barbershop?.id) return;

        const newSocket = io(window.location.origin);
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

        newSocket.on(`disconnected_${barbershop.id}`, (data) => {
            setSession(prev => ({
                ...prev!,
                status: 'disconnected',
                is_connected: false,
                phone_number: undefined
            }));
            setQrCodeImage('');
            updateSessionInDatabase('disconnected');
        });
    };

    const fetchWhatsAppData = async () => {
        if (!barbershop?.id) return;

        try {
            // Buscar sessão do WhatsApp no banco
            const { data: sessionData } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('barbershop_id', barbershop.id)
                .single();

            // Verificar status real no servidor
            const serverStatus = await checkServerStatus();

            if (sessionData) {
                // Sincronizar com o status real do servidor
                const actualStatus = serverStatus.connected ? 'connected' : 'disconnected';
                const actualConnected = serverStatus.connected;
                
                setSession({
                    ...sessionData,
                    status: actualStatus,
                    is_connected: actualConnected
                });

                // Atualizar banco se houver diferença
                if (sessionData.status !== actualStatus || sessionData.is_connected !== actualConnected) {
                    await updateSessionInDatabase(actualStatus);
                }

                if (sessionData.qr_code && !serverStatus.connected) {
                    const qrImage = await QRCode.toDataURL(sessionData.qr_code);
                    setQrCodeImage(qrImage);
                }
            } else if (serverStatus.connected) {
                // Servidor conectado mas sem registro no banco - criar registro
                await updateSessionInDatabase('connected');
                setSession({
                    id: '',
                    status: 'connected',
                    is_connected: true,
                    phone_number: serverStatus.phone
                });
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
            console.error('Error fetching WhatsApp data:', error);
        }
    };

    const checkServerStatus = async () => {
        if (!barbershop?.id) return { connected: false };

        try {
            const response = await fetch(`/api/whatsapp/status/${barbershop.id}`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error checking server status:', error);
            return { connected: false };
        }
    };

    const updateSessionInDatabase = async (status: string, phoneNumber?: string) => {
        if (!barbershop?.id) return;

        try {
            const updateData: any = {
                barbershop_id: barbershop.id,
                status,
                is_connected: status === 'connected'
            };

            if (phoneNumber) {
                updateData.phone_number = phoneNumber;
                updateData.last_connected_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('whatsapp_sessions')
                .upsert(updateData, {
                    onConflict: 'barbershop_id'
                });

            if (error) {
                console.error('Error updating session in database:', error);
            }
        } catch (error) {
            console.error('Error in updateSessionInDatabase:', error);
        }
    };

    const initializeWhatsApp = async () => {
        if (!barbershop?.id) return;

        setLoading(true);
        try {
            // Chamar API do servidor WhatsApp
            const response = await fetch(`/api/whatsapp/connect/${barbershop.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                setSession(prev => ({
                    ...prev,
                    id: prev?.id || '',
                    status: 'connecting',
                    is_connected: false
                }));
                await updateSessionInDatabase('connecting');
            } else {
                console.error('Erro ao inicializar WhatsApp:', result.message);
            }
        } catch (error) {
            console.error('Error initializing WhatsApp:', error);
        } finally {
            setLoading(false);
        }
    };

    const disconnectWhatsApp = async () => {
        if (!barbershop?.id) return;

        try {
            const response = await fetch(`/api/whatsapp/disconnect/${barbershop.id}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                setSession(prev => ({
                    ...prev!,
                    status: 'disconnected',
                    is_connected: false,
                    phone_number: undefined
                }));
                setQrCodeImage('');
                await updateSessionInDatabase('disconnected');
                
                // Limpar dados de teste
                setTestPhone('');
                setTestMessage('');
            }
        } catch (error) {
            console.error('Error disconnecting WhatsApp:', error);
        }
    };



    const updateTemplate = async (templateId: string, newTemplate: string) => {
        const { error } = await supabase
            .from('whatsapp_templates')
            .update({ message_template: newTemplate })
            .eq('id', templateId);

        if (!error) {
            setTemplates(prev =>
                prev.map(t =>
                    t.id === templateId
                        ? { ...t, message_template: newTemplate }
                        : t
                )
            );
        }
    };

    const sendTestMessage = async () => {
        if (!barbershop?.id || !testPhone.trim() || !testMessage.trim()) {
            alert('Preencha o número e a mensagem');
            return;
        }

        setTestLoading(true);
        try {
            const response = await fetch(`/api/whatsapp/test/${barbershop.id}`, {
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
                alert('Mensagem de teste enviada com sucesso!');
                setTestMessage('');
            } else {
                alert(`Erro ao enviar mensagem: ${result.error}`);
            }
        } catch (error) {
            console.error('Error sending test message:', error);
            alert('Erro ao enviar mensagem de teste');
        } finally {
            setTestLoading(false);
        }
    };

    const useTemplate = (template: WhatsAppTemplate) => {
        // Processar template com dados de exemplo
        let processedMessage = template.message_template
            .replace('{client_name}', 'João Silva')
            .replace('{appointment_date}', '15/01/2025')
            .replace('{appointment_time}', '14:30')
            .replace('{service_name}', 'Corte + Barba')
            .replace('{service_price}', '35,00')
            .replace('{barbershop_name}', barbershop?.name || 'Sua Barbearia')
            .replace('{barbershop_address}', barbershop?.address || 'Endereço da barbearia');
        
        setTestMessage(processedMessage);
        setActiveTab('test');
    };

    const getStatusIcon = () => {
        switch (session?.status) {
            case 'connected':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'connecting':
                return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <XCircle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusText = () => {
        switch (session?.status) {
            case 'connected':
                return `Conectado - ${session.phone_number}`;
            case 'connecting':
                return 'Conectando...';
            case 'error':
                return 'Erro na conexão';
            default:
                return 'Desconectado';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                    <button
                        onClick={() => setActiveTab('connection')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'connection'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4 inline mr-2" />
                        Conexão WhatsApp
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'templates'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Settings className="w-4 h-4 inline mr-2" />
                        Templates de Mensagem
                    </button>
                    <button
                        onClick={() => setActiveTab('test')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'test'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Send className="w-4 h-4 inline mr-2" />
                        Teste de Envio
                    </button>
                </nav>
            </div>

            <div className="p-6">
                {activeTab === 'connection' && (
                    <div className="space-y-6">
                        <div className="bg-green-50 p-4 rounded-lg mb-6">
                            <h4 className="text-sm font-medium text-green-800 mb-1">✅ WhatsApp Web Integração Real</h4>
                            <p className="text-xs text-green-700">
                                Esta integração usa o WhatsApp Web real. Certifique-se de que o servidor WhatsApp está rodando na porta 3001.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Status da Conexão</h3>
                                <div className="flex items-center mt-2">
                                    {getStatusIcon()}
                                    <span className="ml-2 text-sm text-gray-600">{getStatusText()}</span>
                                </div>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={fetchWhatsAppData}
                                    className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center text-sm"
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Verificar Status
                                </button>
                                
                                {!session?.is_connected ? (
                                    <button
                                        onClick={initializeWhatsApp}
                                        disabled={loading || session?.status === 'connecting'}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center"
                                    >
                                        <Smartphone className="w-4 h-4 mr-2" />
                                        {loading ? 'Conectando...' : 'Conectar WhatsApp'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={disconnectWhatsApp}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Desconectar
                                    </button>
                                )}
                            </div>
                        </div>

                        {session?.status === 'connecting' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-blue-50 p-6 rounded-lg text-center"
                            >
                                <h4 className="text-lg font-medium mb-4 text-blue-800">Conectando ao WhatsApp</h4>
                                {qrCodeImage ? (
                                    <div>
                                        <p className="text-sm text-blue-700 mb-4">
                                            Escaneie o QR Code com seu WhatsApp:
                                        </p>
                                        <img src={qrCodeImage} alt="QR Code WhatsApp" className="mx-auto mb-4 border rounded" />
                                        <p className="text-xs text-blue-600">
                                            1. Abra o WhatsApp no seu celular<br/>
                                            2. Vá em Menu → Dispositivos conectados<br/>
                                            3. Toque em "Conectar um dispositivo"<br/>
                                            4. Escaneie este código
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                                        <p className="text-blue-700">Gerando QR Code...</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {session?.is_connected && (
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h4 className="text-lg font-medium text-green-800 mb-2">✅ WhatsApp Conectado!</h4>
                                <p className="text-sm text-green-700 mb-2">
                                    Número conectado: <strong>{session.phone_number}</strong>
                                </p>
                                <p className="text-sm text-green-700">
                                    Seu WhatsApp está conectado e pronto para enviar mensagens reais para seus clientes!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Templates de Mensagem</h3>

                        {templates.map((template) => (
                            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                                    <button
                                        onClick={() => useTemplate(template)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                    >
                                        Testar Template
                                    </button>
                                </div>
                                <textarea
                                    value={template.message_template}
                                    onChange={(e) => updateTemplate(template.id, e.target.value)}
                                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
                                    placeholder="Digite sua mensagem..."
                                />
                                <div className="mt-2 text-xs text-gray-500">
                                    <p>Variáveis disponíveis: {'{client_name}, {appointment_date}, {appointment_time}, {service_name}, {service_price}, {barbershop_name}'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'test' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Teste de Envio de Mensagens</h3>
                        
                        {!session?.is_connected && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-yellow-800">⚠️ WhatsApp não está conectado. Conecte primeiro para enviar mensagens de teste.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Telefone (com código do país)
                                </label>
                                <input
                                    type="text"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="Ex: +5511999999999"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Formato: +55 (código do país) + DDD + número
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
                                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {testMessage.length} caracteres
                                </p>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={sendTestMessage}
                                    disabled={testLoading || !session?.is_connected || !testPhone.trim() || !testMessage.trim()}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {testLoading ? 'Enviando...' : 'Enviar Teste'}
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setTestPhone('');
                                        setTestMessage('');
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">💡 Dicas para Teste</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Use seu próprio número para testar</li>
                                <li>• Certifique-se de que o número está no formato correto</li>
                                <li>• Teste os templates antes de usar em produção</li>
                                <li>• Verifique se o WhatsApp está conectado</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppConfig;