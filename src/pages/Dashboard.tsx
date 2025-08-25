import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Trash2, Plus, Filter, DollarSign, Users, Loader2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboard } from '../contexts/DashboardContext';
import { supabase, Appointment } from '../lib/supabase';
import ConfirmationModal from '../components/ConfirmationModal';

interface Stats {
  totalRevenue: number;
  todayAppointments: number;
  totalClients: number;
}

const Dashboard: React.FC = () => {
  const { barbershop, openAppointmentModal, refetchData } = useDashboard();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, todayAppointments: 0, totalClients: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('appointment_date', { ascending: false });
      if (appointmentsError) throw appointmentsError;

      const totalRevenue = appointmentsData
        .filter(a => a.status === 'concluido')
        .reduce((sum, a) => sum + (a.service_price || 0), 0) / 100;
      const todayAppointmentsCount = appointmentsData
        .filter(a => isToday(parseISO(a.appointment_date))).length;
      const totalClientsCount = new Set(appointmentsData.map(a => a.client_phone)).size;
      
      setAppointments(appointmentsData);
      setStats({
        totalRevenue,
        todayAppointments: todayAppointmentsCount,
        totalClients: totalClientsCount
      });
    } catch (error) {
      console.error("An unexpected error occurred:", error);
    } finally {
      setLoading(false);
    }
  }, [barbershop?.id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDeleteClick = (appointmentId: string) => {
    setItemToDelete(appointmentId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('appointments').delete().eq('id', itemToDelete);
    
    if (error) {
      alert(`Erro ao excluir o agendamento: ${error.message}`);
    } else {
      fetchAppointments(); // Refetch only appointments after a delete
    }
    
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-blue-100 text-blue-800';
      case 'agendado': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'today') return isToday(parseISO(a.appointment_date));
    return a.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full"><DollarSign className="h-6 w-6 text-green-600"/></div>
              <div>
                  <p className="text-sm text-gray-500">Faturamento (Concluído)</p>
                  <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full"><Calendar className="h-6 w-6 text-blue-600"/></div>
              <div>
                  <p className="text-sm text-gray-500">Agendamentos Hoje</p>
                  <p className="text-2xl font-bold">{stats.todayAppointments}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full"><Users className="h-6 w-6 text-purple-600"/></div>
              <div>
                  <p className="text-sm text-gray-500">Total de Clientes</p>
                  <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
          </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Próximos Agendamentos</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500"/>
              <select onChange={(e) => setFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">Todos</option>
                <option value="today">Hoje</option>
                <option value="agendado">Agendados</option>
                <option value="confirmado">Confirmados</option>
                <option value="concluido">Concluídos</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
             <button onClick={() => openAppointmentModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm">
                <Plus className="h-5 w-5" />
                <span>Agendamento</span>
              </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data & Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{app.client_name}</div>
                    <div className="text-xs text-gray-500">{app.client_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{app.service_name}</div>
                    <div className="text-xs text-gray-500">R$ {(app.service_price / 100).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-800 capitalize">{format(parseISO(app.appointment_date), "EEEE, dd/MM", { locale: ptBR })}</div>
                      <div className="text-gray-500">{app.start_time} - {app.end_time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusPill(app.status)} capitalize`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-3">
                      <button onClick={() => openAppointmentModal(app)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteClick(app.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAppointments.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                  <p>Nenhum agendamento encontrado para este filtro.</p>
              </div>
          )}
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita."
        isLoading={isDeleting}
      />
    </>
  );
};
export default Dashboard;
