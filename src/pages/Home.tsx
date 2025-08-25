import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, BarChart, Smartphone, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Agenda Inteligente',
      description: 'Gerencie múltiplos profissionais, serviços e horários com uma agenda online fácil de usar.',
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'Mantenha um histórico completo de seus clientes, agendamentos e preferências.',
    },
    {
      icon: BarChart,
      title: 'Relatórios e Análises',
      description: 'Tome decisões baseadas em dados com relatórios de faturamento, serviços mais populares e mais.',
    },
    {
      icon: Smartphone,
      title: 'Agendamento Online 24/7',
      description: 'Permita que seus clientes agendem horários a qualquer momento, diretamente pelo seu site ou redes sociais.',
    },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1622288432454-24154e79aee2?auto=format&fit=crop&w=2070&q=80)'
          }}
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
              Modernize sua Barbearia.
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-200">
              BarberFlow é a plataforma completa para gestão e agendamento online que vai transformar o seu negócio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Scissors className="h-5 w-5" />
                <span>Comece seu teste grátis</span>
              </Link>
              <Link
                to="/funcionalidades"
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                Ver Funcionalidades
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para crescer
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma foi desenhada para simplificar sua rotina e impulsionar seus resultados.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonial */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
            <motion.blockquote 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
            >
                <p className="text-2xl font-medium text-gray-800">
                    "Desde que comecei a usar o BarberFlow, minha agenda lotou e eu economizo horas de trabalho administrativo toda semana. Meus clientes adoram a facilidade de agendar online!"
                </p>
                <footer className="mt-6">
                    <div className="font-semibold text-gray-900">Jonas Almeida</div>
                    <div className="text-gray-600">Dono da Barbearia Navalha de Ouro</div>
                </footer>
            </motion.blockquote>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para levar sua barbearia para o próximo nível?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de barbeiros que já estão transformando seus negócios.
            </p>
            <Link
              to="/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-transform hover:scale-105 inline-block"
            >
              Criar minha conta agora
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
