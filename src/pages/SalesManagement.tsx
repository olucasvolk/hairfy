import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { supabase, Sale, SaleItem, Product, Client } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Plus, DollarSign, User, Calendar, Search, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmationModal from '../components/ConfirmationModal';

interface EnrichedSale extends Sale {
  sale_items: (SaleItem & { products: Product | null })[];
  clients: Client | null;
}

const SalesManagement: React.FC = () => {
  const { barbershop, loading: dashboardLoading, openSaleModal, refetchData } = useDashboard();
  const [sales, setSales] = useState<EnrichedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!barbershop?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(*)), clients(*)')
      .eq('barbershop_id', barbershop.id)
      .order('sale_date', { ascending: false });
    
    if (error) {
      console.error("Error fetching sales:", error);
    } else {
      setSales(data as EnrichedSale[] || []);
    }
    setLoading(false);
  }, [barbershop?.id]);

  useEffect(() => {
    if (!dashboardLoading && barbershop?.id) {
      fetchSales();
    }
  }, [barbershop?.id, dashboardLoading, fetchSales]);

  const handleCancelClick = (saleId: string) => {
    setItemToCancel(saleId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!itemToCancel) return;
    setIsCancelling(true);
    const { error } = await supabase.rpc('cancel_sale', { p_sale_id: itemToCancel });
    
    if (error) {
      alert(`Erro ao cancelar a venda: ${error.message}`);
    } else {
      fetchSales(); // Refetch sales to update the list
      refetchData(); // Refetch all dashboard data to update stock in other components
    }
    
    setIsCancelling(false);
    setIsConfirmModalOpen(false);
    setItemToCancel(null);
  };

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const lowercasedFilter = searchTerm.toLowerCase();
    return sales.filter(sale =>
      (sale.clients?.name && sale.clients.name.toLowerCase().includes(lowercasedFilter)) ||
      sale.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [sales, searchTerm]);

  if (loading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-semibold">Gerenciar Vendas</h3>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={() => openSaleModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm flex-shrink-0">
              <Plus className="h-5 w-5" />
              <span>Nova Venda</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {format(parseISO(sale.sale_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm font-semibold text-gray-900">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {sale.clients?.name || 'Venda Avulsa'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {sale.sale_items.map(item => (
                      <div key={item.id}>{item.quantity}x {item.products?.name || 'Produto Removido'}</div>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-green-700 font-bold">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {(sale.total_amount / 100).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleCancelClick(sale.id)} className="text-red-600 hover:text-red-800" title="Cancelar Venda">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhuma venda registrada ainda.</p>
              <p className="text-sm">Clique em "Nova Venda" para começar.</p>
            </div>
          )}
          {sales.length > 0 && filteredSales.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhuma venda encontrada para "{searchTerm}".</p>
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Confirmar Cancelamento"
        message="Tem certeza que deseja cancelar esta venda? Os produtos serão retornados ao estoque e esta ação não pode ser desfeita."
        confirmText="Sim, Cancelar"
        isLoading={isCancelling}
      />
    </>
  );
};

export default SalesManagement;
