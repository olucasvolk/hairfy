import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { Clock, MessageCircle, CheckCircle, XCircle, RefreshCw, Calendar, Phone } from 'lucide-react';
import { processReminders } from '../utils/whatsappReminder';

interface ReminderStats {
  total_appointments: number;
  pending_reminders: number;
  sent_reminders: number;
  failed_reminders: number;
}

interface UpcomingAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  start_time: string;
  service_name: string;
  staff_name: string;
  reminder_sent: boolean;
  status: string;
}

const WhatsAppReminders: React.FC = () => {
  const { barbershop } = useDashboard();
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    if (!barbershop?.id) return;

    try {
      setLoading(true);

      // Buscar estatísticas
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .eq('appointment_date', tomorrowStr)
        .in('status', ['agendado', 'confirmado']);

      if (error) throw error;

      const stats: ReminderStats = {
        total_appointments: appointments?.length || 0,
        pending_reminders: appointments?.filter(a => !a.reminder_sent).length || 0,
        sent_reminders: appointments?.filter(a => a.reminder_sent).length || 0,
        failed_reminders: 0 // TODO: implementar contagem de falhas
      };

      setStats(stats);
      setUpcomingAppointments(appointments || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRemindersManually = async () => {
    setProcessing(true);
    try {
      const result = await processReminders();
      alert(`Processamento concluído!\n\nProcessados: ${result.processed}\nEnviados: ${result.sent}\nErros: ${result.errors}`);
      await loadData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao processar lembretes:', error);
      alert('Erro ao processar lembretes. Verifique o console.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [barbershop?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lembretes WhatsApp</h1>
          <p className="text-gray-600">Gerencie lembretes automáticos de agendamentos</p>
        </div>
        <button
          onClick={processRemindersManually}
          disabled={processing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
        >
          {processing ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          <span>{processing ? 'Processando...' : 'Processar Agora'}</span>
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amanhã</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_appointments}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_reminders}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent_reminders}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Falhas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed_reminders}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lista de Agendamentos */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Agendamentos de Amanhã</h2>
          <p className="text-sm text-gray-600">Lembretes serão enviados automaticamente 24h antes</p>
        </div>

        <div className="divide-y">
          {upcomingAppointments.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum agendamento para amanhã</p>
            </div>
          ) : (
            upcomingAppointments.map((appointment) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {appointment.reminder_sent ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.client_name}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {appointment.client_phone}
                          </span>
                          <span>{appointment.start_time}</span>
                          <span>{appointment.service_name}</span>
                          <span>com {appointment.staff_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.reminder_sent
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.reminder_sent ? 'Lembrete Enviado' : 'Pendente'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'confirmado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status === 'confirmado' ? 'Confirmado' : 'Agendado'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <MessageCircle className="h-6 w-6 text-blue-600 mt-1" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Como Funciona</h3>
            <div className="mt-2 text-sm text-blue-800">
              <ul className="list-disc list-inside space-y-1">
                <li>O sistema verifica automaticamente a cada hora</li>
                <li>Lembretes são enviados 24h antes do agendamento</li>
                <li>Apenas agendamentos "Agendado" e "Confirmado" recebem lembretes</li>
                <li>Cada agendamento recebe apenas um lembrete</li>
                <li>Use o botão "Processar Agora" para enviar lembretes manualmente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppReminders;