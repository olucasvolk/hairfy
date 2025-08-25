import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, Client, Appointment, Sale, SaleItem, Product } from '../lib/supabase';
import { X, Loader2, User, Phone, Mail, Edit, BookText, Calendar, ShoppingCart, DollarSign } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

interface SaleWithItems extends Sale {
  sale_items: (SaleItem & { products: Product | null })[];
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ isOpen, onClose, client }) => {
  const { openClientModal } = useDashboard();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!client?.id) return;
      setLoading(true);

      const [appointmentsRes, salesRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('client_id', client.id).order('appointment_date', { ascending: false }),
        supabase.from('sales').select('*, sale_items(*, products(*))').eq('client_id', client.id).order('sale_date', { ascending: false })
      ]);

      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
      if (salesRes.data) setSales(salesRes.data as SaleWithItems[]);

      setLoading(false);
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleEditClick = () => {
    onClose(); // Close this modal
    openClientModal(client); // Open the edit modal
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {client.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/>{client.phone}</span>}
                {client.email && <span className="flex items-center"><Mail className="w-3 h-3 mr-1"/>{client.email}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleEditClick} className="text-gray-500 hover:text-blue-700 p-2 rounded-full bg-gray-100 hover:bg-blue-100"><Edit className="w-4 h-4"/></button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
          </div>
        </div>
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {client.notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <BookText className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{client.notes}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600 h-8 w-8" /></div> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service History */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-500"/> Histórico de Serviços</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {appointments.length > 0 ? appointments.map(app => (
                    <div key={app.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{app.service_name}</p>
                          <p className="text-xs text-gray-500">com {app.staff_name || 'N/A'}</p>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">{format(parseISO(app.appointment_date), "dd/MM/yyyy")}</p>
                      </div>
                      <div className="text-right mt-1 font-bold text-sm text-blue-700">
                        R$ {((app.service_price + (app.products_total || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                  )) : <p className="text-sm text-gray-500 text-center py-4">Nenhum serviço registrado.</p>}
                </div>
              </div>

              {/* Product Purchase History */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center"><ShoppingCart className="w-5 h-5 mr-2 text-green-500"/> Histórico de Compras</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {sales.length > 0 ? sales.map(sale => (
                    <div key={sale.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm text-gray-800">Venda #{sale.id.substring(0, 6)}</p>
                        <p className="text-xs text-gray-600 font-medium">{format(parseISO(sale.sale_date), "dd/MM/yyyy")}</p>
                      </div>
                      {sale.sale_items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs ml-2">
                          <p>{item.quantity}x {item.products?.name || 'Produto removido'}</p>
                          <p>R$ {(item.price_at_time_of_sale / 100).toFixed(2)}</p>
                        </div>
                      ))}
                      <div className="text-right mt-1 font-bold text-sm text-green-700">
                        Total: R$ {(sale.total_amount / 100).toFixed(2)}
                      </div>
                    </div>
                  )) : <p className="text-sm text-gray-500 text-center py-4">Nenhuma compra avulsa registrada.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ClientDetailModal;
