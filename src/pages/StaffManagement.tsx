import React, { useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { Plus, Edit, Trash2, Mail, Phone, Percent, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, StaffMember } from '../lib/supabase';
import StaffForm from '../components/StaffForm';
import ConfirmationModal from '../components/ConfirmationModal';

const StaffManagement: React.FC = () => {
  const { staff, barbershop, loading, refetchData } = useDashboard();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenModal = (member: StaffMember | null = null) => {
    setStaffToEdit(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStaffToEdit(null);
  };

  const handleDeleteClick = (staffId: string) => {
    setItemToDelete(staffId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('staff_members').delete().eq('id', itemToDelete);
    
    if (error) {
      alert(`Erro ao excluir o profissional: ${error.message}`);
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
          <h3 className="text-lg font-semibold">Gerenciar Profissionais</h3>
          <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm">
            <Plus className="h-5 w-5" />
            <span>Novo Profissional</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img className="h-10 w-10 rounded-full object-cover mr-4" src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name.replace(' ', '+')}&background=random`} alt={member.name} />
                      <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {member.email && <div className="flex items-center text-xs text-gray-500 mb-1"><Mail className="w-3 h-3 mr-2" />{member.email}</div>}
                    {member.phone && <div className="flex items-center text-xs text-gray-500"><Phone className="w-3 h-3 mr-2" />{member.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <Percent className="w-4 h-4 mr-2 text-gray-400" />
                      {member.commission_percentage}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {member.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-3">
                      <button onClick={() => handleOpenModal(member)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteClick(member.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           {staff.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhum profissional cadastrado ainda.</p>
              <p className="text-sm">Clique em "Novo Profissional" para começar.</p>
            </div>
          )}
        </div>
      </motion.div>
      {barbershop && (
        <StaffForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={refetchData}
          staffToEdit={staffToEdit}
          barbershopId={barbershop.id}
        />
      )}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Profissional"
        message="Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita."
        isLoading={isDeleting}
      />
    </>
  );
};

export default StaffManagement;
