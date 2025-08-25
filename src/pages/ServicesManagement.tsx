import React, { useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { Plus, Edit, Trash2, DollarSign, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, Service } from '../lib/supabase';
import ServiceForm from '../components/ServiceForm';
import ConfirmationModal from '../components/ConfirmationModal';

const ServicesManagement: React.FC = () => {
  const { services, barbershop, loading, refetchData } = useDashboard();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenModal = (service: Service | null = null) => {
    setServiceToEdit(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setServiceToEdit(null);
  };

  const handleDeleteClick = (serviceId: string) => {
    setItemToDelete(serviceId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('services').delete().eq('id', itemToDelete);
    
    if (error) {
      alert(`Erro ao excluir o serviço: ${error.message}`);
    } else {
      refetchData();
    }
    
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gerenciar Serviços</h3>
          <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm">
            <Plus className="h-5 w-5" />
            <span>Novo Serviço</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome do Serviço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {service.duration_minutes} min
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-700 font-semibold">
                      <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                      {(service.price / 100).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-3">
                      <button onClick={() => handleOpenModal(service)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteClick(service.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {services.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhum serviço cadastrado ainda.</p>
              <p className="text-sm">Clique em "Novo Serviço" para começar.</p>
            </div>
          )}
        </div>
      </motion.div>
      {barbershop && (
        <ServiceForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={refetchData}
          serviceToEdit={serviceToEdit}
          barbershopId={barbershop.id}
        />
      )}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Serviço"
        message="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
        isLoading={isDeleting}
      />
    </>
  );
};

export default ServicesManagement;
