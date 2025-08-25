import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Precos: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Básico',
      price: { monthly: 49, yearly: 490 },
      description: 'Ideal para barbeiros autônomos e iniciantes.',
      features: [
        '1 Profissional',
        'Agenda Online',
        'Cadastro de Clientes',
        'Lembretes por E-mail',
      ],
      isPopular: false,
    },
    {
      name: 'Profissional',
      price: { monthly: 89, yearly: 890 },
      description: 'Perfeito para barbearias em crescimento com mais de um profissional.',
      features: [
        'Até 5 Profissionais',
        'Tudo do plano Básico',
        'Lembretes por WhatsApp',
        'Relatórios Financeiros',
        'Controle de Comissões',
      ],
      isPopular: true,
    },
    {
      name: 'Premium',
      price: { monthly: 149, yearly: 1490 },
      description: 'A solução completa para grandes barbearias e redes.',
      features: [
        'Profissionais Ilimitados',
        'Tudo do plano Profissional',
        'Programa de Fidelidade',
        'API para Integrações',
        'Suporte Prioritário',
      ],
      isPopular: false,
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
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Planos que cabem no seu bolso
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Escolha o plano ideal para o momento da sua barbearia. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-200 rounded-full p-1 flex items-center">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === 'monthly' ? 'bg-white text-gray-800 shadow' : 'text-gray-600'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-white text-gray-800 shadow' : 'text-gray-600'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`bg-white rounded-2xl shadow-lg p-8 flex flex-col ${
                plan.isPopular ? 'border-4 border-blue-600 relative' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>Mais Popular</span>
                </div>
              )}
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-extrabold text-gray-900">
                    R$ {billingCycle === 'monthly' ? plan.price.monthly : (plan.price.yearly / 12).toFixed(0)}
                  </span>
                  <span className="text-lg text-gray-500">/mês</span>
                </div>
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  to="/signup"
                  className={`w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                    plan.isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Começar agora
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Precos;
