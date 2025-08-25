import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scissors, User, Mail, Lock, Building, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [barbershopName, setBarbershopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // The database trigger 'on_auth_user_created' will now handle barbershop creation automatically.
    // We just need to pass the required data in the user metadata.
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: ownerName,
          barbershop_name: barbershopName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Não foi possível criar o usuário. Verifique os dados e tente novamente.");
      setLoading(false);
      return;
    }
    
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 pt-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900">Cadastro realizado com sucesso!</h2>
          <p className="text-gray-600">
            Enviamos um e-mail de confirmação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada para ativar sua conta.
          </p>
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 inline-block mt-4">
            Ir para a página de Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg"
      >
        <div className="text-center">
          <Link to="/" className="inline-block">
            <Scissors className="h-12 w-12 text-blue-600 mx-auto" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-center text-gray-900">
            Crie sua conta grátis
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Já possui uma conta?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Faça login
            </Link>
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center" role="alert">
                <AlertCircle className="w-5 h-5 mr-2"/>
                <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="barbershop-name" className="text-sm font-medium text-gray-700">
              Nome da Barbearia
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="barbershop-name"
                name="barbershop-name"
                type="text"
                required
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Navalha de Ouro"
              />
            </div>
          </div>

          <div>
            <label htmlFor="owner-name" className="text-sm font-medium text-gray-700">
              Seu Nome
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="owner-name"
                name="owner-name"
                type="text"
                autoComplete="name"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-mail
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="seu-melhor-email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password"className="text-sm font-medium text-gray-700">
              Crie uma Senha
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Signup;
