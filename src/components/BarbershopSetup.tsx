import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BarbershopSetupProps {
  onSetupComplete: () => void;
}

const BarbershopSetup: React.FC<BarbershopSetupProps> = ({ onSetupComplete }) => {
  const { user } = useAuth();
  const [barbershopName, setBarbershopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBarbershop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !barbershopName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Primeiro, garantir que o usuário existe na tabela public.users
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
        }, {
          onConflict: 'id'
        });

      if (userError) {
        console.error('Error creating/updating user:', userError);
        throw userError;
      }

      // Agora criar a barbearia
      const { error: insertError } = await supabase
        .from('barbershops')
        .insert({
          owner_id: user.id,
          name: barbershopName.trim(),
        });

      if (insertError) throw insertError;

      onSetupComplete();
    } catch (err: any) {
      console.error('Error creating barbershop:', err);
      if (err.code === '23503') {
        setError('Erro de configuração do usuário. Tente fazer logout e login novamente.');
      } else {
        setError(err.message || 'Erro ao criar barbearia');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg"
      >
        <div className="text-center">
          <Building className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configure sua Barbearia
          </h2>
          <p className="text-gray-600">
            Para começar a usar o sistema, precisamos criar o perfil da sua barbearia.
          </p>
        </div>

        <form onSubmit={handleCreateBarbershop} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="barbershop-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Barbearia
            </label>
            <input
              id="barbershop-name"
              type="text"
              required
              value={barbershopName}
              onChange={(e) => setBarbershopName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Navalha de Ouro"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !barbershopName.trim()}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Barbearia'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          <p>Você poderá editar essas informações depois no painel de configurações.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default BarbershopSetup;