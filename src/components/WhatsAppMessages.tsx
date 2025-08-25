import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppMessage {
  id: string;
  client_name: string;
  client_phone: string;
  message_type: 'confirmation' | 'reminder' | 'custom';
  message_content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string;
  appointment_id?: string;
}

const WhatsAppMessages: React.FC = () => {
  const { barbershop } = useDashboard();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmation' | 'reminder' | 'custom'>('all');

  useEffect(() => {
    if (barbershop?.id) {
      fetchMessages();
    }
  }, [barbershop?.id]);

  const fetchMessages = async () => {
    if (!barbershop?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'delivered':
        return 'Entregue';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'confirmation':
        return 'bg-blue-100 text-blue-800';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800';
      case 'custom':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'confirmation':
        return 'Confirmação';
      case 'reminder':
        return 'Lembrete';
      case 'custom':
        return 'Personalizada';
      default:
        return type;
    }
  };

  const filteredMessages = messages.filter(message => 
    filter === 'all' || message.message_type === filter
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
            Histórico de Mensagens
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('confirmation')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'confirmation' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Confirmações
            </button>
            <button
              onClick={() => setFilter('reminder')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'reminder' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Lembretes
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma mensagem encontrada</p>
            <p className="text-sm">As mensagens enviadas aparecerão aqui</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(message.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{message.client_name}</h4>
                    <p className="text-sm text-gray-500">{message.client_phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(message.message_type)}`}>
                    {getTypeText(message.message_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getStatusText(message.status)}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.message_content}
                </p>
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  {format(parseISO(message.sent_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
                {message.appointment_id && (
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    Agendamento #{message.appointment_id.slice(-8)}
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default WhatsAppMessages;