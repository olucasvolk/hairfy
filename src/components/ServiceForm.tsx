import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, Service } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface ServiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  serviceToEdit?: Service | null;
  barbershopId: string;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceToEdit,
  barbershopId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        name: serviceToEdit.name,
        description: serviceToEdit.description || '',
        duration_minutes: serviceToEdit.duration_minutes,
        price: serviceToEdit.price / 100, // Convert cents to BRL for display
        is_active: serviceToEdit.is_active,
      });
    } else {
      setFormData({
        name: '', description: '', duration_minutes: 30, price: 0, is_active: true,
      });
    }
  }, [serviceToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const serviceData = {
      ...formData,
      barbershop_id: barbershopId,
      price: Math.round(formData.price * 100), // Convert BRL to cents for storage
    };

    let result;
    if (serviceToEdit) {
      result = await supabase.from('services').update(serviceData).eq('id', serviceToEdit.id);
    } else {
      result = await supabase.from('services').insert(serviceData);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      onSave();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{serviceToEdit ? 'Editar' : 'Novo'} Serviço</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Serviço</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Duração (minutos)</label>
              <input type="number" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} required min="5" step="5" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Preço (R$)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required min="0" step="0.01" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Descrição (Opcional)</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" rows={3}></textarea>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Serviço Ativo</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center font-medium transition-colors">
              {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              {serviceToEdit ? 'Salvar Alterações' : 'Criar Serviço'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ServiceForm;
