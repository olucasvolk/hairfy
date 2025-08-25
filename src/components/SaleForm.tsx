import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, Client } from '../lib/supabase';
import { X, Loader2, Trash2, ShoppingBag, Search, UserPlus, XCircle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';

type SaleModalData = { client?: Client } | null;

interface SaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: SaleModalData;
  barbershopId: string;
}

const SaleForm: React.FC<SaleFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  barbershopId,
}) => {
  const { clients, openProductSelectionModal, saleItems, handleRemoveProductFromSale, handleSaleItemQuantityChange } = useDashboard();
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [includeInRevenue, setIncludeInRevenue] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setSelectedClient(initialData?.client || null);
        setClientSearchText(initialData?.client?.name || '');
        setNewClientName('');
        setNewClientPhone('');
        setIsCreatingNewClient(false);
        setIncludeInRevenue(true);
        setError(null);
    }
  }, [isOpen, initialData]);
  
  const filteredClients = useMemo(() => {
    if (!clientSearchText) return [];
    const lowercasedFilter = clientSearchText.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(lowercasedFilter) || c.phone.includes(lowercasedFilter));
  }, [clients, clientSearchText]);

  const totalAmount = useMemo(() => {
    return saleItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [saleItems]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setClientSearchText(client.name);
    setIsCreatingNewClient(false);
    setShowClientDropdown(false);
  };
  
  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientSearchText(e.target.value);
    setSelectedClient(null); // Deselect if user types
    setIsCreatingNewClient(false);
    setShowClientDropdown(true);
  };

  const handleCreateNewClientClick = () => {
    setIsCreatingNewClient(true);
    setNewClientName(clientSearchText);
    setSelectedClient(null);
    setShowClientDropdown(false);
  }

  const clearClientSelection = () => {
    setSelectedClient(null);
    setIsCreatingNewClient(false);
    setClientSearchText('');
    setNewClientName('');
    setNewClientPhone('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      setError("Adicione pelo menos um produto à venda.");
      return;
    }
    setLoading(true);
    setError(null);

    let finalClientId: string | null = selectedClient?.id || null;

    if (isCreatingNewClient && newClientName && newClientPhone) {
      const { data: clientId, error: clientError } = await supabase.rpc('get_or_create_client_id', {
        p_barbershop_id: barbershopId, p_client_name: newClientName,
        p_client_phone: newClientPhone, p_client_email: null,
      });
      if (clientError || !clientId) {
        setError(`Erro ao criar novo cliente: ${clientError?.message || 'ID do cliente não retornado.'}`);
        setLoading(false); return;
      }
      finalClientId = clientId;
    }

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        barbershop_id: barbershopId,
        client_id: finalClientId,
        total_amount: totalAmount,
        include_in_revenue: includeInRevenue,
      })
      .select()
      .single();

    if (saleError) {
      setError(saleError.message);
      setLoading(false);
      return;
    }

    const itemsToInsert = saleItems.map(item => ({
      sale_id: saleData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_time_of_sale: item.product.price,
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);

    if (itemsError) {
      await supabase.from('sales').delete().eq('id', saleData.id);
      setError(`Erro ao salvar itens da venda: ${itemsError.message}`);
      setLoading(false);
      return;
    }

    onSave();
    onClose();
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Nova Venda</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
          </div>
          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"><p>{error}</p></div>}
            
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Cliente</label>
              {selectedClient ? (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded-md">
                  <p className="font-medium text-blue-800">{selectedClient.name}</p>
                  <button type="button" onClick={clearClientSelection} className="text-red-500 hover:text-red-700"><XCircle className="w-5 h-5"/></button>
                </div>
              ) : isCreatingNewClient ? (
                 <div className="bg-gray-50 p-3 rounded-md space-y-2">
                    <input type="text" placeholder="Nome do Novo Cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required className="w-full p-2 border rounded-md"/>
                    <input type="tel" placeholder="Telefone do Novo Cliente" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} required className="w-full p-2 border rounded-md"/>
                    <button type="button" onClick={clearClientSelection} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                 </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar ou digitar nome do novo cliente..."
                    value={clientSearchText}
                    onChange={handleClientSearchChange}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                    className="w-full pl-10 p-2 border rounded-md"
                  />
                  {showClientDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredClients.map(c => (
                        <div key={c.id} onMouseDown={() => handleClientSelect(c)} className="p-2 hover:bg-blue-50 cursor-pointer">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone}</p>
                        </div>
                      ))}
                      {clientSearchText && !filteredClients.find(c => c.name === clientSearchText) && (
                        <div onMouseDown={handleCreateNewClientClick} className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-blue-600">
                          <UserPlus className="w-4 h-4" />
                          <span>Criar novo cliente: "{clientSearchText}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <button type="button" onClick={openProductSelectionModal} className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md text-gray-600 hover:bg-gray-50 hover:border-blue-500 transition-colors">
                <ShoppingBag className="w-5 h-5"/>
                Adicionar Produto
              </button>
            </div>

            <div className="space-y-2">
              {saleItems.length > 0 ? saleItems.map(item => (
                <div key={item.product.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">R$ {(item.product.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={item.quantity} onChange={(e) => handleSaleItemQuantityChange(item.product.id, parseInt(e.target.value))} max={item.product.stock_quantity} min="1" className="w-16 p-1 border rounded-md text-center"/>
                    <p className="font-semibold text-sm w-20 text-right">R$ {(item.product.price * item.quantity / 100).toFixed(2)}</p>
                    <button type="button" onClick={() => handleRemoveProductFromSale(item.product.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-sm text-gray-500 py-4">Nenhum produto adicionado.</p>
              )}
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <input type="checkbox" id="include_in_revenue" checked={includeInRevenue} onChange={e => setIncludeInRevenue(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                    <label htmlFor="include_in_revenue" className="ml-2 block text-sm text-gray-900">Incluir no faturamento</label>
                </div>
                <p className="text-xl font-bold text-right">Total: <span className="text-blue-600">R$ {(totalAmount / 100).toFixed(2)}</span></p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-400 flex items-center">
                {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
                Registrar Venda
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default SaleForm;
