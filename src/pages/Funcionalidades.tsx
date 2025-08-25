import React from 'react';
import { Calendar, Users, BarChart, Smartphone, Bell, CreditCard, Gift, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Funcionalidades: React.FC = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Agenda Online Completa',
      description: 'Gerencie múltiplos profissionais, bloqueie horários, e visualize sua agenda por dia, semana ou mês. Totalmente otimizada para celular.',
      category: 'Gestão'
    },
    {
      icon: Smartphone,
      title: 'Agendamento pelo Cliente',
      description: 'Ofereça um link exclusivo para seus clientes agendarem online 24/7, integrado com seu site, Instagram e WhatsApp.',
      category: 'Cliente'
    },
    {
      icon: Users,
      title: 'Cadastro de Clientes (CRM)',
      description: 'Mantenha um histórico detalhado de cada cliente, incluindo serviços realizados, preferências, e anotações importantes.',
      category: 'Gestão'
    },
    {
      icon: Bell,
      title: 'Lembretes Automáticos',
      description: 'Reduza as faltas (no-shows) com lembretes de agendamento automáticos enviados por WhatsApp ou E-mail para seus clientes.',
      category: 'Cliente'
    },
    {
      icon: BarChart,
      title: 'Relatórios Inteligentes',
      description: 'Acompanhe o desempenho do seu negócio com relatórios de faturamento, comissões, serviços mais populares e muito mais.',
      category: 'Análise'
    },
    {
      icon: CreditCard,
      title: 'Controle Financeiro',
      description: 'Registre todas as entradas e saídas, gerencie o fluxo de caixa e tenha uma visão clara da saúde financeira da sua barbearia.',
      category: 'Gestão'
    },
    {
      icon: Gift,
      title: 'Programas de Fidelidade',
      description: 'Crie programas de pontos e recompensas para incentivar seus clientes a retornarem sempre.',
      category: 'Cliente'
    },
    {
      icon: Settings,
      title: 'Personalização Avançada',
      description: 'Cadastre seus próprios serviços, preços, durações e configure a plataforma para se adaptar perfeitamente ao seu negócio.',
      category: 'Gestão'
    },
  ];

  return (
    <div className="pt-20 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Funcionalidades Poderosas para sua Barbearia
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubra as ferramentas que vão simplificar sua gestão e impulsionar seu crescimento.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col"
            >
              <div className="flex-shrink-0">
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 flex-grow">{feature.description}</p>
              </div>
              <div className="mt-4">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${
                  feature.category === 'Gestão' ? 'bg-blue-500' :
                  feature.category === 'Cliente' ? 'bg-green-500' :
                  'bg-purple-500'
                }`}>
                  {feature.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-10 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Experimente todas essas funcionalidades com nosso teste grátis de 14 dias. Sem compromisso, sem cartão de crédito.
          </p>
          <Link to="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-transform hover:scale-105 inline-block">
            Criar minha conta
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Funcionalidades;
