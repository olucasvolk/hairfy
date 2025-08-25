import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase, StaffMember, Service } from '../lib/supabase';
import { X, Loader2, UploadCloud } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';

interface StaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  staffToEdit?: StaffMember | null;
  barbershopId: string;
}

const StaffForm: React.FC<StaffFormProps> = ({
  isOpen,
  onClose,
  onSave,
  staffToEdit,
  barbershopId,
}) => {
  const { services } = useDashboard();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_percentage: 0,
    is_active: true,
  });
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedServices = useCallback(async (staffId: string) => {
    const { data, error } = await supabase
      .from('staff_services')
      .select('service_id')
      .eq('staff_id', staffId);
    
    if (error) {
      console.error("Error fetching assigned services:", error);
      return;
    }
    
    const serviceIds = new Set(data.map(item => item.service_id));
    setSelectedServices(serviceIds);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (staffToEdit) {
        setFormData({
          name: staffToEdit.name,
          email: staffToEdit.email || '',
          phone: staffToEdit.phone || '',
          commission_percentage: staffToEdit.commission_percentage,
          is_active: staffToEdit.is_active,
        });
        setAvatarPreview(staffToEdit.avatar_url || null);
        fetchAssignedServices(staffToEdit.id);
      } else {
        setFormData({
          name: '', email: '', phone: '', commission_percentage: 0, is_active: true,
        });
        setAvatarPreview(null);
        setSelectedServices(new Set());
      }
      setAvatarFile(null);
    }
  }, [staffToEdit, isOpen, fetchAssignedServices]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    const newSelectedServices = new Set(selectedServices);
    if (newSelectedServices.has(serviceId)) {
      newSelectedServices.delete(serviceId);
    } else {
      newSelectedServices.add(serviceId);
    }
    setSelectedServices(newSelectedServices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let avatarUrl = staffToEdit?.avatar_url || null;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${barbershopId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        setError(`Erro no upload da imagem: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage.from('staff-avatars').getPublicUrl(filePath);
      avatarUrl = data.publicUrl;
    }

    const staffData = {
      ...formData,
      barbershop_id: barbershopId,
      email: formData.email || null,
      phone: formData.phone || null,
      avatar_url: avatarUrl,
    };

    const { data: savedStaff, error: staffError } = await (staffToEdit
      ? supabase.from('staff_members').update(staffData).eq('id', staffToEdit.id).select().single()
      : supabase.from('staff_members').insert(staffData).select().single());

    if (staffError) {
      setError(staffError.message);
      setLoading(false);
      return;
    }

    // Manage staff_services associations
    const staffId = savedStaff.id;
    
    // 1. Delete existing associations
    const { error: deleteError } = await supabase
      .from('staff_services')
      .delete()
      .eq('staff_id', staffId);

    if (deleteError) {
      setError(`Erro ao atualizar serviços: ${deleteError.message}`);
      setLoading(false);
      return;
    }

    // 2. Insert new associations
    if (selectedServices.size > 0) {
      const newAssociations = Array.from(selectedServices).map(serviceId => ({
        staff_id: staffId,
        service_id: serviceId,
      }));
      const { error: insertError } = await supabase
        .from('staff_services')
        .insert(newAssociations);

      if (insertError) {
        setError(`Erro ao associar serviços: ${insertError.message}`);
        setLoading(false);
        return;
      }
    }

    onSave();
    onClose();
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{staffToEdit ? 'Editar' : 'Novo'} Profissional</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
          
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UploadCloud className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div>
              <label htmlFor="avatar-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Trocar Foto
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF até 2MB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome Completo</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail (Opcional)</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Telefone (Opcional)</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Comissão (%)</label>
            <input type="number" value={formData.commission_percentage} onChange={e => setFormData({...formData, commission_percentage: parseInt(e.target.value)})} required min="0" max="100" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Serviços Realizados</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto">
              {services.map((service) => (
                <label key={service.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedServices.has(service.id)}
                    onChange={() => handleServiceToggle(service.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-800">{service.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="is_active_staff" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
            <label htmlFor="is_active_staff" className="ml-2 block text-sm text-gray-900">Profissional Ativo</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center font-medium transition-colors">
              {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              {staffToEdit ? 'Salvar Alterações' : 'Criar Profissional'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default StaffForm;
