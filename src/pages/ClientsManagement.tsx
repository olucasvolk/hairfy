import React, { useState, useMemo } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { Client } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Search, User, Phone, Mail, CalendarPlus, Eye } from 'lucide-react';

const ClientsManagement: React.FC = () => {
  const { clients, loading: dashboardLoading, openAppointmentModal, openClientDetailModal } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedFilter = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(lowercasedFilter) ||
      (client.phone && client.phone.includes(lowercasedFilter))
    );
  }, [clients, searchTerm]);

  const handleScheduleForClient = (client: Client) => {
    openAppointmentModal({
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      client_email: client.email || '',
    });
  };

  const handleViewDetails = (client: Client) => {
    openClientDetailModal(client);
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Gerenciar Clientes</h3>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{client.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {client.phone && <div className="flex items-center text-xs text-gray-500 mb-1"><Phone className="w-3 h-3 mr-2" />{client.phone}</div>}
                  {client.email && <div className="flex items-center text-xs text-gray-500"><Mail className="w-3 h-3 mr-2" />{client.email}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleScheduleForClient(client)} 
                      className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center space-x-2 text-xs"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      <span>Agendar</span>
                    </button>
                    <button 
                      onClick={() => handleViewDetails(client)} 
                      className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2 text-xs"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Histórico</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p>Nenhum cliente encontrado.</p>
            <p className="text-sm">Os clientes são adicionados automaticamente após o primeiro agendamento.</p>
          </div>
        )}
        {clients.length > 0 && filteredClients.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <p>Nenhum cliente encontrado para "{searchTerm}".</p>
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default ClientsManagement;
