import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Smartphone, CheckCircle, XCircle, RefreshCw, Settings, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';

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
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'connection' | 'templates' | 'test'>('connection');
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [testLoading, setTestLoading] = useState(false);

    useEffect(() => {
        if (barbershop?.id) {
            fetchWhatsAppData();
        }
    }, [barbershop?.id]);

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

    const handleConnect = async () => {
        setLoading(true);
        try {
            // Em produção, apenas mostra uma mensagem informativa
            alert('WhatsApp integration is available in development mode. Please contact support for production setup.');
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
            await supabase
                .from('whatsapp_sessions')
                .update({
                    is_connected: false,
                    status: 'disconnected'
                })
                .eq('barbershop_id', barbershop.id);

            setSession(prev => prev ? { ...prev, is_connected: false, status: 'disconnected' } : null);
        } catch (error) {
            console.error('Erro ao desconectar WhatsApp:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone || !testMessage) return;

        setTestLoading(true);
        try {
            // Em produção, apenas simula o envio
            alert(`Test message would be sent to ${testPhone}: ${testMessage}`);
            setTestPhone('');
            setTestMessage('');
        } catch (error) {
            console.error('Erro ao enviar mensagem de teste:', error);
        } finally {
            setTestLoading(false);
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
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 text-sm">
                        <strong>Nota:</strong> A integração completa do WhatsApp está disponível apenas no modo de desenvolvimento. 
                        Para usar em produção, entre em contato com o suporte.
                    </p>
                </div>
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
                        disabled={!testPhone || !testMessage || testLoading}
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
                {activeTab === 'test' && renderTestTab()}
            </motion.div>
        </div>
    );
};

export default WhatsAppConfig;