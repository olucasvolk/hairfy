import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Appointment, Service, StaffMember, Product } from '../lib/supabase';
import { X, Loader2, PlusCircle, Trash2, MessageCircle } from 'lucide-react';
import { addMinutes, format } from 'date-fns';
import { useDashboard } from '../contexts/DashboardContext';
import { useWhatsApp } from '../hooks/useWhatsApp';

type InitialData = Appointment | Partial<Appointment> | null;
type AddedProduct = { product: Product; quantity: number };

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: InitialData;
  barbershopId: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  barbershopId,
}) => {
  const { products: allProducts, staff, services } = useDashboard();
  const { sendAppointmentConfirmation } = useWhatsApp(barbershopId);
  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', client_email: '', service_id: '',
    staff_member_id: '', appointment_date: '', start_time: '', notes: '',
    status: 'agendado' as const,
  });
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = initialData && 'id' in initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          client_name: initialData.client_name || '',
          client_phone: initialData.client_phone || '',
          client_email: initialData.client_email || '',
          service_id: 'service_id' in initialData ? initialData.service_id || '' : '',
          staff_member_id: 'staff_member_id' in initialData ? initialData.staff_member_id || '' : '',
          appointment_date: 'appointment_date' in initialData ? format(new Date(initialData.appointment_date!), 'yyyy-MM-dd') : '',
          start_time: initialData.start_time || '',
          notes: initialData.notes || '',
          status: initialData.status || 'agendado',
        });
        // Here you would fetch and set existing products for the appointment if editing
      } else {
        // Reset form for new appointment
        setFormData({
          client_name: '', client_phone: '', client_email: '', service_id: '',
          staff_member_id: '', appointment_date: '', start_time: '', notes: '', status: 'agendado'
        });
        setAddedProducts([]);
      }
    }
  }, [isOpen, initialData]);

  const { serviceTotal, productsTotal, grandTotal } = useMemo(() => {
    const selectedService = services.find(s => s.id === formData.service_id);
    const serviceTotal = selectedService ? selectedService.price : 0;
    const productsTotal = addedProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    return {
      serviceTotal,
      productsTotal,
      grandTotal: serviceTotal + productsTotal,
    };
  }, [formData.service_id, addedProducts, services]);

  const handleAddProduct = (productId: string) => {
    const productToAdd = allProducts.find(p => p.id === productId);
    if (!productToAdd) return;

    setAddedProducts(prev => {
      const existing = prev.find(p => p.product.id === productId);
      if (existing) {
        return prev.map(p => p.product.id === productId ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { product: productToAdd, quantity: 1 }];
    });
  };

  const handleRemoveProduct = (productId: string) => {
    setAddedProducts(prev => prev.filter(p => p.product.id !== productId));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Get or create client
    const { data: clientId, error: clientError } = await supabase.rpc('get_or_create_client_id', {
      p_barbershop_id: barbershopId, p_client_name: formData.client_name,
      p_client_phone: formData.client_phone, p_client_email: formData.client_email || null,
    });
    if (clientError || !clientId) {
      setError(`Erro ao processar cliente: ${clientError?.message || 'ID do cliente não retornado.'}`);
      setLoading(false); return;
    }

    // 2. Prepare appointment data
    const selectedService = services.find(s => s.id === formData.service_id);
    if (!selectedService) {
        setError("Serviço selecionado é inválido."); setLoading(false); return;
    }
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endTime = format(addMinutes(startDate, selectedService.duration_minutes), 'HH:mm');

    const appointmentData = {
      barbershop_id: barbershopId, client_id: clientId, client_name: formData.client_name,
      client_phone: formData.client_phone, client_email: formData.client_email || null,
      service_id: selectedService.id, staff_member_id: formData.staff_member_id || null,
      appointment_date: formData.appointment_date, start_time: formData.start_time,
      notes: formData.notes || null, status: formData.status, service_name: selectedService.name,
      service_price: selectedService.price, products_total: productsTotal,
      duration_minutes: selectedService.duration_minutes, end_time: endTime,
      staff_name: staff.find(s => s.id === formData.staff_member_id)?.name || 'Qualquer Profissional',
    };

    // 3. Save appointment (insert or update)
    const { data: savedAppointment, error: appointmentError } = await (isEditing
      ? supabase.from('appointments').update(appointmentData).eq('id', (initialData as Appointment).id).select().single()
      : supabase.from('appointments').insert(appointmentData).select().single());
      
    if (appointmentError) {
      setError(appointmentError.message); setLoading(false); return;
    }

    // 4. Manage appointment_products
    // For simplicity, we delete all and re-insert. For production, a diff would be better.
    if (isEditing) {
      await supabase.from('appointment_products').delete().eq('appointment_id', savedAppointment.id);
    }
    if (addedProducts.length > 0) {
      const productsToInsert = addedProducts.map(item => ({
        appointment_id: savedAppointment.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time_of_sale: item.product.price,
      }));
      const { error: productsError } = await supabase.from('appointment_products').insert(productsToInsert);
      if (productsError) {
        setError(`Agendamento salvo, mas houve um erro ao adicionar produtos: ${productsError.message}`);
        setLoading(false); return;
      }
    }

    // 5. Enviar mensagem de confirmação via WhatsApp (apenas para novos agendamentos)
    if (!isEditing) {
      try {
        await sendAppointmentConfirmation({
          id: savedAppointment.id,
          client_name: savedAppointment.client_name,
          client_phone: savedAppointment.client_phone,
          appointment_date: savedAppointment.appointment_date,
          start_time: savedAppointment.start_time,
          service_name: savedAppointment.service_name,
          service_price: savedAppointment.service_price
        });
      } catch (whatsappError) {
        console.warn('WhatsApp message failed:', whatsappError);
        // Não bloquear o salvamento se o WhatsApp falhar
      }
    }

    onSave();
    onClose();
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar' : 'Novo'} Agendamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"><p>{error}</p></div>}
          
          {/* Client & Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 col-span-full">Dados do Cliente</h3>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Nome</label><input type="text" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} required className="w-full p-2 border rounded-md"/></div>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Telefone</label><input type="tel" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} required className="w-full p-2 border rounded-md"/></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label><input type="email" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} className="w-full p-2 border rounded-md"/></div>
            
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 col-span-full pt-4">Detalhes do Agendamento</h3>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Serviço</label><select value={formData.service_id} onChange={e => setFormData({...formData, service_id: e.target.value})} required className="w-full p-2 border rounded-md"><option value="">Selecione</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Profissional</label><select value={formData.staff_member_id} onChange={e => setFormData({...formData, staff_member_id: e.target.value})} className="w-full p-2 border rounded-md"><option value="">Qualquer um</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Data</label><input type="date" value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})} required className="w-full p-2 border rounded-md"/></div>
            <div><label className="block text-sm font-medium text-gray-600 mb-1">Hora</label><input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required className="w-full p-2 border rounded-md"/></div>
            {isEditing && (<div><label className="block text-sm font-medium text-gray-600 mb-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Appointment['status']})} required className="w-full p-2 border rounded-md"><option value="agendado">Agendado</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option><option value="nao_compareceu">Não Compareceu</option></select></div>)}
          </div>

          {/* Products Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 pt-4">Adicionar Produtos</h3>
            <div className="flex items-center gap-2 mt-2">
              <select onChange={e => handleAddProduct(e.target.value)} className="flex-grow p-2 border rounded-md" defaultValue="">
                <option value="" disabled>Selecione um produto...</option>
                {allProducts.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {(p.price / 100).toFixed(2)}</option>)}
              </select>
            </div>
            <div className="mt-4 space-y-2">
              {addedProducts.map(item => (
                <div key={item.product.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Qtd: {item.quantity} x R$ {(item.product.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">R$ {(item.product.price * item.quantity / 100).toFixed(2)}</p>
                    <button type="button" onClick={() => handleRemoveProduct(item.product.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="text-right space-y-1">
              <p className="text-sm">Serviço: <span className="font-medium">R$ {(serviceTotal / 100).toFixed(2)}</span></p>
              <p className="text-sm">Produtos: <span className="font-medium">R$ {(productsTotal / 100).toFixed(2)}</span></p>
              <p className="text-lg font-bold">Total: <span className="text-blue-600">R$ {(grandTotal / 100).toFixed(2)}</span></p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-400 flex items-center">
              {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AppointmentForm;
