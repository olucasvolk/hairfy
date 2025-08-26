import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Funcionalidades from './pages/Funcionalidades';
import Precos from './pages/Precos';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import { DashboardProvider } from './contexts/DashboardContext';
import ServicesManagement from './pages/ServicesManagement';
import StaffManagement from './pages/StaffManagement';
import ClientsManagement from './pages/ClientsManagement';
import ProductsManagement from './pages/ProductsManagement';
import SalesManagement from './pages/SalesManagement';
import Reports from './pages/Reports';
import WhatsAppSettings from './pages/WhatsAppSettings';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import WhatsAppTest from './pages/WhatsAppTest';
import WhatsAppReminders from './pages/WhatsAppReminders';



function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">

        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/funcionalidades" element={<Funcionalidades />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/agendamento/:barbershop_id" element={<Booking />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardProvider>
                  <DashboardLayout />
                </DashboardProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="servicos" element={<ServicesManagement />} />
            <Route path="profissionais" element={<StaffManagement />} />
            <Route path="clientes" element={<ClientsManagement />} />
            <Route path="produtos" element={<ProductsManagement />} />
            <Route path="vendas" element={<SalesManagement />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="whatsapp" element={<WhatsAppSettings />} />
            <Route path="whatsapp/templates" element={<WhatsAppTemplates />} />
            <Route path="whatsapp/test" element={<WhatsAppTest />} />
            <Route path="whatsapp/reminders" element={<WhatsAppReminders />} />

          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
