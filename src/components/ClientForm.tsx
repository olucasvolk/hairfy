import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Client } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  clientToEdit: Partial<Client> | null;
}

const ClientForm: React.FC<ClientFormProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setFormData({
        name: clientToEdit.name || '',
        phone: clientToEdit.phone || '',
        email: clientToEdit.email || '',
        notes: clientToEdit.notes || '',
      });
    }
  }, [clientToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit?.id) {
        setError("ID do cliente não encontrado.");
        return;
    }
    setLoading(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('update_client_and_propagate', {
        p_client_id: clientToEdit.id,
        p_new_name: formData.name,
        p_new_phone: formData.phone,
        p_new_email: formData.email,
        p_new_notes: formData.notes,
    });

    if (rpcError) {
      setError(rpcError.message);
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
          <h2 className="text-xl font-bold text-gray-800">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Cliente</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Telefone</label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-mail (Opcional)</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Observação (Preferências, Alergias, etc.)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Ex: prefere a máquina 2, tem alergia a certo produto..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center font-medium transition-colors">
              {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ClientForm;
