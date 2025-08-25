import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search, PlusCircle, AlertTriangle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { Product } from '../lib/supabase';

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({ isOpen, onClose }) => {
  const { products, saleItems, handleSelectProductForSale, openAlertModal } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowercasedFilter = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedFilter)
    );
  }, [products, searchTerm]);

  const handleProductClick = (product: Product) => {
    const currentQuantityInCart = saleItems.find(item => item.product.id === product.id)?.quantity || 0;
    if (currentQuantityInCart >= product.stock_quantity) {
      openAlertModal({
        title: "Estoque Insuficiente",
        message: `Você já adicionou a quantidade máxima em estoque (${product.stock_quantity}) para o produto "${product.name}".`,
      });
      return;
    }
    handleSelectProductForSale(product);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col"
      >
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Selecionar Produto</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
        </div>
        <div className="p-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {filteredProducts.map(product => {
            const currentQuantityInCart = saleItems.find(item => item.product.id === product.id)?.quantity || 0;
            const isOutOfStock = currentQuantityInCart >= product.stock_quantity;
            
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`flex justify-between items-center p-3 rounded-lg transition-colors ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}`}
              >
                <div>
                  <p className={`font-semibold ${isOutOfStock ? '' : 'text-gray-800'}`}>{product.name}</p>
                  <p className={`text-sm ${isOutOfStock ? 'text-red-400' : 'text-gray-500'}`}>
                    {product.stock_quantity <= 0 ? 'Esgotado' : `Estoque: ${product.stock_quantity}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-bold ${isOutOfStock ? '' : 'text-gray-900'}`}>R$ {(product.price / 100).toFixed(2)}</p>
                  {isOutOfStock ? <AlertTriangle className="w-6 h-6 text-red-400"/> : <PlusCircle className="w-6 h-6 text-blue-500"/>}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="text-center text-gray-500 py-6">Nenhum produto encontrado.</p>
          )}
        </div>
        <div className="p-4 border-t flex-shrink-0 text-right">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">Concluir</button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductSelectionModal;
