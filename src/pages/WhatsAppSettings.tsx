import React, { useState } from 'react';
import { MessageCircle, Settings, History } from 'lucide-react';
import WhatsAppConfig from '../components/WhatsAppConfig';
import WhatsAppMessages from '../components/WhatsAppMessages';

const WhatsAppSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'messages'>('config');

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold flex items-center">
          <MessageCircle className="w-6 h-6 mr-2 text-green-600" />
          WhatsApp Business
        </h2>
        <p className="text-gray-600 mt-2">
          Configure a integração com WhatsApp para enviar mensagens automáticas aos seus clientes.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'messages'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              Histórico de Mensagens
            </button>
          </nav>
        </div>

        <div className="p-0">
          {activeTab === 'config' && (
            <div className="p-6">
              <WhatsAppConfig />
            </div>
          )}
          {activeTab === 'messages' && <WhatsAppMessages />}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;