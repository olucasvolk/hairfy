import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Scissors, User, Copy, Loader2, AlertCircle, Users as ClientsIcon, Package, ShoppingCart, BarChart3, MessageCircle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { motion } from 'framer-motion';
import AppointmentForm from './AppointmentForm';
import ClientForm from './ClientForm';
import ClientDetailModal from './ClientDetailModal';
import SaleForm from './SaleForm';
import ProductSelectionModal from './ProductSelectionModal';
import AlertModal from './AlertModal';
import BarbershopSetup from './BarbershopSetup';

const DashboardLayout: React.FC = () => {
  const { 
    barbershop, 
    loading, 
    refetchData,
    isAppointmentModalOpen, closeAppointmentModal, appointmentModalData,
    isClientModalOpen, closeClientModal, clientModalData,
    isClientDetailModalOpen, closeClientDetailModal, clientDetailModalData,
    isSaleModalOpen, closeSaleModal, saleModalData,
    isProductSelectionModalOpen, closeProductSelectionModal,
    isAlertModalOpen, closeAlertModal, alertModalContent,
  } = useDashboard();

  const handleCopyBookingLink = () => {
    if (!barbershop) return;
    const link = `${window.location.origin}/agendamento/${barbershop.id}`;
    navigator.clipboard.writeText(link)
      .then(() => alert('Link de agendamento copiado para a área de transferência!'))
      .catch(err => console.error('Failed to copy link: ', err));
  };

  const navItems = [
    { name: 'Agendamentos', path: '/dashboard', icon: Calendar, end: true },
    { name: 'Vendas', path: '/dashboard/vendas', icon: ShoppingCart, end: false },
    { name: 'Relatórios', path: '/dashboard/relatorios', icon: BarChart3, end: false },
    { name: 'Clientes', path: '/dashboard/clientes', icon: ClientsIcon, end: false },
    { name: 'Serviços', path: '/dashboard/servicos', icon: Scissors, end: false },
    { name: 'Produtos', path: '/dashboard/produtos', icon: Package, end: false },
    { name: 'Profissionais', path: '/dashboard/profissionais', icon: User, end: false },
    { name: 'WhatsApp', path: '/dashboard/whatsapp', icon: MessageCircle, end: false },
  ];

  if (loading) {
    return (
      <div className="pt-20 pb-16 bg-gray-100 min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="ml-4 text-gray-700">Carregando dados da sua barbearia...</p>
      </div>
    );
  }

  if (!barbershop) {
    return <BarbershopSetup onSetupComplete={refetchData} />;
  }

  return (
    <>
      <div className="pt-16 min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <header className="py-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{barbershop.name}</h1>
                <p className="text-gray-600">Bem-vindo ao seu painel de controle.</p>
              </div>
              <button onClick={handleCopyBookingLink} className="bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2">
                <Copy className="h-5 w-5" />
                <span>Copiar Link de Agendamento</span>
              </button>
            </motion.div>
          </header>

          <nav className="bg-white rounded-lg shadow-sm mb-8">
            <ul className="flex items-center p-2 space-x-2 overflow-x-auto">
              {navItems.map(item => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors flex-shrink-0 ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <main className="pb-16">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Modals */}
      {barbershop && (
        <AppointmentForm
          isOpen={isAppointmentModalOpen}
          onClose={closeAppointmentModal}
          onSave={refetchData}
          initialData={appointmentModalData}
          barbershopId={barbershop.id}
        />
      )}
      {barbershop && (
        <ClientForm
          isOpen={isClientModalOpen}
          onClose={closeClientModal}
          onSave={() => {
            refetchData();
            closeClientModal();
          }}
          clientToEdit={clientModalData}
        />
      )}
      {clientDetailModalData && (
        <ClientDetailModal
          isOpen={isClientDetailModalOpen}
          onClose={closeClientDetailModal}
          client={clientDetailModalData}
        />
      )}
      {barbershop && (
        <SaleForm
          isOpen={isSaleModalOpen}
          onClose={closeSaleModal}
          onSave={refetchData}
          initialData={saleModalData}
          barbershopId={barbershop.id}
        />
      )}
      <ProductSelectionModal
            isOpen={isProductSelectionModalOpen}
            onClose={closeProductSelectionModal}
      />
      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={closeAlertModal}
        title={alertModalContent.title}
        message={alertModalContent.message}
      />
    </>
  );
};

export default DashboardLayout;
