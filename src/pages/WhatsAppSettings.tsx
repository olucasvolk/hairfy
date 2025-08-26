import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { Loader2, MessageCircle, Smartphone, AlertCircle, MessageSquare, TestTube, ArrowRight } from 'lucide-react';

const WhatsAppSettings: React.FC = () => {
  const { barbershop } = useDashboard();
  const [status, setStatus] = useState('🔄 Verificando conexão...');
  const [qrCode, setQrCode] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('');
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [lastInstanceCreation, setLastInstanceCreation] = useState<number>(0);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const API_BASE = "https://hairfycombr.uazapi.com";
  const ADMIN_TOKEN = "clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig";

  useEffect(() => {
    if (barbershop?.id) {
      inicializarWhatsApp();
    }

    // Cleanup do interval quando componente desmonta
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [barbershop?.id]);

  // Função para monitoramento contínuo do status
  const iniciarMonitoramento = (instanceToken: string) => {
    // Limpar interval anterior se existir
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }

    // Verificar status a cada 10 segundos (menos agressivo)
    const interval = setInterval(async () => {
      console.log('🔄 Verificação automática de status (10s)...');
      await verificarStatusSilencioso(instanceToken);
    }, 10000);

    setStatusCheckInterval(interval);
  };

  // Função para verificar status sem mostrar loading
  const verificarStatusSilencioso = async (instanceToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/instance/status`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        }
      });

      const data = await response.json();
      console.log('🔍 Verificação silenciosa:', {
        connected: data.status?.connected,
        loggedIn: data.status?.loggedIn,
        instanceStatus: data.instance?.status,
        responseStatus: response.status
      });

      // Verificar se token é inválido - só criar nova instância se realmente necessário
      if (response.status === 401 || data.error?.includes('Invalid token') || data.error?.includes('not found')) {
        console.log('❌ Token inválido na verificação silenciosa');
        if (isConnected) {
          // Marcar como desconectado, mas vai tentar reutilizar token primeiro
          await marcarComoDesconectado();
        }
        return;
      }

      if (data.status?.connected && data.status?.loggedIn && data.instance?.status === 'connected') {
        // Ainda conectado, atualizar dados se necessário
        if (!isConnected) {
          console.log('✅ Reconectado detectado!');
          await atualizarDadosConexao(data);
        }
      } else {
        // Desconectado! Atualizar interface imediatamente
        console.log('❌ Desconexão detectada! Status:', {
          connected: data.status?.connected,
          loggedIn: data.status?.loggedIn,
          instanceStatus: data.instance?.status
        });
        await marcarComoDesconectado();
      }
    } catch (error) {
      console.error('❌ Erro na verificação silenciosa:', error);
      // Se der erro na verificação, pode ser que a instância foi deletada
      if (isConnected) {
        console.log('❌ Erro na verificação, marcando como desconectado');
        await marcarComoDesconectado();
      }
    }
  };

  // Função para atualizar dados quando reconecta
  const atualizarDadosConexao = async (data: any) => {
    const profileData = {
      status: 'connected',
      is_connected: true,
      last_connected_at: new Date().toISOString(),
      phone_number: data.instance?.owner || data.status?.jid?.split(':')[0] || null,
      profile_name: data.instance?.profileName || null,
      profile_pic_url: data.instance?.profilePicUrl || null,
      instance_id: data.instance?.id || null,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('whatsapp_sessions')
      .update(profileData)
      .eq('barbershop_id', barbershop.id);

    // Atualizar interface
    setPhoneNumber(profileData.phone_number || '');
    setProfileName(profileData.profile_name || '');
    setProfilePicUrl(profileData.profile_pic_url || '');
    setInstanceId(profileData.instance_id || '');
    setIsConnected(true);
    setQrCode('');
  };

  // Função para atualizar dados diretamente do connect
  const atualizarDadosConexaoFromConnect = async (data: any) => {
    const profileData = {
      status: 'connected',
      is_connected: true,
      last_connected_at: new Date().toISOString(),
      phone_number: data.instance?.owner || null,
      profile_name: data.instance?.profileName || null,
      profile_pic_url: data.instance?.profilePicUrl || null,
      instance_id: data.instance?.id || null,
      updated_at: new Date().toISOString()
    };

    console.log('💾 SALVANDO DADOS DO CONNECT:', JSON.stringify(profileData, null, 2));

    await supabase
      .from('whatsapp_sessions')
      .update(profileData)
      .eq('barbershop_id', barbershop.id);

    // Atualizar interface
    setPhoneNumber(profileData.phone_number || '');
    setProfileName(profileData.profile_name || '');
    setProfilePicUrl(profileData.profile_pic_url || '');
    setInstanceId(profileData.instance_id || '');
    setIsConnected(true);
    setQrCode('');
    setLoading(false);

    // Limpar timeout de segurança
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    // Iniciar monitoramento contínuo
    iniciarMonitoramento(token);
  };

  // Função para marcar como desconectado
  const marcarComoDesconectado = async () => {
    console.log('🔄 Atualizando banco: marcando como desconectado');
    
    // Parar monitoramento
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    
    await supabase
      .from('whatsapp_sessions')
      .update({
        is_connected: false,
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershop.id);

    // Atualizar interface imediatamente (MANTER TOKEN)
    setIsConnected(false);
    setQrCode('');
    
    // Se tem token, gerar novo QR Code automaticamente
    if (token) {
      console.log('🔄 Desconectado! Gerando novo QR Code automaticamente...');
      setLoading(true);
      
      // Aguardar 1 segundo e gerar novo QR Code
      setTimeout(() => {
        buscarQRCode(token);
      }, 1000);
    } else {
      console.log('🔄 Sem token! Criando nova instância automaticamente...');
      setLoading(true);
      
      // Criar nova instância automaticamente
      setTimeout(() => {
        criarInstancia();
      }, 1000);
    }
  };

  const inicializarWhatsApp = async () => {
    if (!barbershop?.id) return;

    // Limpar timeout anterior se existir
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }

    // Timeout de segurança: se ficar carregando por mais de 30 segundos, mostrar erro
    const timeout = setTimeout(() => {
      console.log('⏰ Timeout: Preparação demorou mais de 30 segundos');
      setLoading(false);
      setStatus('❌ Timeout: Conexão demorou muito. Tente novamente.');
    }, 30000);
    setLoadingTimeout(timeout);

    try {
      // Verificar se já existe sessão WhatsApp no banco
      const { data: existingSession } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .single();

      if (existingSession?.instance_token) {
        // Já tem token, verificar se está conectado no banco primeiro
        setToken(existingSession.instance_token);
        
        // SEMPRE verificar status na API, independente do que está no banco
        console.log('📱 DADOS DO BANCO:', JSON.stringify(existingSession, null, 2));
        console.log('🔄 Verificando status atual na API...');
        
        setToken(existingSession.instance_token);
        
        // Carregar dados do banco temporariamente
        if (existingSession.is_connected) {
          setPhoneNumber(existingSession.phone_number || '');
          setProfileName(existingSession.profile_name || '');
          setProfilePicUrl(existingSession.profile_pic_url || '');
          setInstanceId(existingSession.instance_id || '');
          setIsConnected(true);
        }
        
        // Usar connect diretamente que já retorna QR Code se necessário
        await buscarQRCode(existingSession.instance_token);
        
        // Iniciar monitoramento contínuo
        iniciarMonitoramento(existingSession.instance_token);
      } else {
        // Não tem token, criar nova instância
        setStatus('🔄 Criando nova instância...');
        await criarInstancia();
      }
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
      setStatus('🔄 Criando nova instância...');
      await criarInstancia();
    } finally {
      // Limpar timeout se chegou até aqui
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    }
  };

  const criarInstancia = async () => {
    if (!barbershop?.id) return;

    // CONTROLE RIGOROSO: Verificar se já existe instância para esta barbearia
    console.log('🔍 VERIFICANDO SE JÁ EXISTE INSTÂNCIA PARA BARBEARIA:', barbershop.id);
    
    const { data: existingSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .single();

    if (existingSession?.instance_token) {
      console.log('⚠️ BARBEARIA JÁ TEM INSTÂNCIA! Token:', existingSession.instance_token);
      setStatus('⚠️ Esta barbearia já possui uma instância WhatsApp. Usando instância existente...');
      setToken(existingSession.instance_token);
      
      // Tentar usar a instância existente
      await buscarQRCode(existingSession.instance_token);
      return;
    }

    // CONTROLE: Evitar múltiplas criações simultâneas
    if (isCreatingInstance) {
      console.log('⚠️ Já está criando instância, ignorando...');
      return;
    }

    // CONTROLE: Evitar criar instância muito frequentemente (mínimo 30 segundos)
    const now = Date.now();
    if (now - lastInstanceCreation < 30000) {
      console.log('⚠️ Criação de instância muito frequente, aguardando...');
      setStatus('⚠️ Aguarde 30 segundos antes de criar nova instância');
      return;
    }

    setIsCreatingInstance(true);
    setLastInstanceCreation(now);

    try {
      console.log('🔄 CRIANDO ÚNICA INSTÂNCIA PARA BARBEARIA:', barbershop.id);
      
      // Nome único e fixo para a barbearia (sem random)
      const nomeInstancia = `barbearia-${barbershop.id}`;
      
      const response = await fetch(`${API_BASE}/instance/init`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'admintoken': ADMIN_TOKEN
        },
        body: JSON.stringify({
          name: nomeInstancia,
          systemName: 'apilocal'
        })
      });

      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        
        console.log('✅ INSTÂNCIA ÚNICA CRIADA! Token:', data.token);
        
        // Salvar token na tabela whatsapp_sessions (CRIAÇÃO ÚNICA)
        await supabase
          .from('whatsapp_sessions')
          .upsert({
            barbershop_id: barbershop.id,
            instance_token: data.token,
            instance_id: data.instance?.id || nomeInstancia,
            status: 'created',
            is_connected: false,
            phone_number: null,
            profile_name: null,
            profile_pic_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        setStatus('✅ Instância única criada! Conectando...');
        buscarQRCode(data.token);
      } else {
        throw new Error('Token não recebido da API');
      }
    } catch (error) {
      console.error('❌ Erro ao criar instância única:', error);
      setStatus('❌ Erro ao criar instância única');
      setLoading(false);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const buscarQRCode = async (instanceToken: string) => {
    // Se já está conectado, não continuar o polling
    if (isConnected) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/instance/connect`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        },
        body: '{}'
      });

      const data = await response.json();
      
      // LOG DETALHADO - Mostrar resposta do /instance/connect
      console.log('🔍 RESPOSTA /instance/connect:', JSON.stringify(data, null, 2));

      // Verificar se token é inválido
      if (response.status === 401 || data.error?.includes('Invalid token') || data.error?.includes('not found')) {
        console.log('❌ Token inválido detectado');
        setStatus('❌ Token inválido. Necessário criar nova instância.');
        setLoading(false);
        // NÃO criar instância automaticamente aqui - deixar usuário decidir
        return;
      }

      // Se já está conectado, salvar dados do perfil diretamente
      if (data.instance?.status === 'connected' || (data.status?.connected && data.status?.loggedIn)) {
        console.log('✅ Já conectado! Salvando dados do perfil...');
        await atualizarDadosConexaoFromConnect(data);
        return;
      }

      if (data.instance?.qrcode) {
        // Atualizar status no banco
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'waiting_scan',
            qr_code: data.instance.qrcode,
            instance_id: data.instance.id || null, // Salvar instance_id se disponível
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershop.id);

        // Só atualizar QR Code se for diferente (evitar piscar)
        if (qrCode !== data.instance.qrcode) {
          setQrCode(data.instance.qrcode);
        }
        setLoading(false);

        // Limpar timeout de segurança
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          setLoadingTimeout(null);
        }
        
        // QR Code já está sendo exibido, verificar a cada 5 segundos
        setTimeout(() => {
          if (!isConnected && qrCode) {
            buscarQRCode(instanceToken);
          }
        }, 5000);
      } else {
        // Atualizar status no banco
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'connecting',
            is_connected: false,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershop.id);

        // Aguardando QR Code silenciosamente
        
        // Aguardando QR Code, verificar em 5 segundos
        setTimeout(() => {
          if (!isConnected && !qrCode) {
            buscarQRCode(instanceToken);
          }
        }, 5000);
      }

    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      setStatus('❌ Erro ao conectar');
      setLoading(false);
    }
  };

  const verificarStatusCompleto = async (instanceToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/instance/status`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        }
      });

      const data = await response.json();
      
      // LOG DETALHADO - Mostrar resposta completa
      console.log('🔍 RESPOSTA COMPLETA DA API /instance/status:', JSON.stringify(data, null, 2));

      if (data.status?.connected && data.status?.loggedIn && data.instance?.status === 'connected') {
        // Conectado! Salvar todas as informações (CONEXÃO)
        const profileData = {
          status: 'connected',
          is_connected: true,
          last_connected_at: new Date().toISOString(),
          phone_number: data.instance?.owner || data.status?.jid?.split(':')[0] || null,
          profile_name: data.instance?.profileName || null,
          profile_pic_url: data.instance?.profilePicUrl || null,
          instance_id: data.instance?.id || null,
          updated_at: new Date().toISOString()
        };

        console.log('💾 DADOS QUE SERÃO SALVOS NO BANCO:', JSON.stringify(profileData, null, 2));
        console.log('📊 DADOS EXTRAÍDOS DA API:');
        console.log('  - instance.owner:', data.instance?.owner);
        console.log('  - instance.profileName:', data.instance?.profileName);
        console.log('  - instance.profilePicUrl:', data.instance?.profilePicUrl);
        console.log('  - instance.id:', data.instance?.id);
        console.log('  - status.jid:', data.status?.jid);
        console.log('  - status.connected:', data.status?.connected);
        console.log('  - status.loggedIn:', data.status?.loggedIn);

        const { data: updateResult, error } = await supabase
          .from('whatsapp_sessions')
          .update(profileData)
          .eq('barbershop_id', barbershop.id);

        if (error) {
          console.error('❌ ERRO AO SALVAR NO BANCO:', error);
        } else {
          console.log('✅ DADOS SALVOS COM SUCESSO NO BANCO');
        }

        // Atualizar interface
        setPhoneNumber(profileData.phone_number || '');
        setProfileName(profileData.profile_name || '');
        setProfilePicUrl(profileData.profile_pic_url || '');
        setInstanceId(profileData.instance_id || '');
        setIsConnected(true);
        setQrCode('');
        setLoading(false);

        // Limpar timeout de segurança
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          setLoadingTimeout(null);
        }

        // Iniciar monitoramento contínuo
        iniciarMonitoramento(instanceToken);
      } else {
        // Não está conectado, buscar QR code APENAS UMA VEZ
        console.log('🔄 Não conectado, buscando QR code...');
        setTimeout(() => {
          buscarQRCode(instanceToken);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setLoading(false);
      // NÃO fazer loop infinito aqui
    }
  };

  const abrirModalDesconectar = () => {
    setShowDisconnectModal(true);
  };

  const fecharModalDesconectar = () => {
    setShowDisconnectModal(false);
  };

  const confirmarDesconectar = async () => {
    if (!barbershop?.id || !token) return;

    setShowDisconnectModal(false);
    setIsDisconnecting(true);
    setStatus('🔄 Desconectando...');

    try {
      // Desconectar usando o endpoint correto
      await fetch(`${API_BASE}/instance/disconnect`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token
        }
      });

      // Marcar como desconectado no Supabase (MANTER TOKEN)
      await supabase
        .from('whatsapp_sessions')
        .update({
          is_connected: false,
          status: 'disconnected',
          phone_number: null,
          profile_name: null,
          profile_pic_url: null,
          qr_code: null,
          updated_at: new Date().toISOString()
          // NÃO remover instance_token - manter para reutilizar
        })
        .eq('barbershop_id', barbershop.id);

      // Parar monitoramento
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }

      // Resetar estado da interface (MANTER TOKEN)
      setQrCode('');
      setPhoneNumber('');
      setProfileName('');
      setProfilePicUrl('');
      setInstanceId('');
      setIsConnected(false);
      setStatus('✅ WhatsApp desconectado com sucesso!');
      
      console.log('✅ DESCONECTADO MAS INSTÂNCIA MANTIDA. Token preservado:', token);
      
      // Parar loading do botão imediatamente
      setIsDisconnecting(false);
      
      // Reinicializar após 2 segundos (vai reutilizar a mesma instância)
      setTimeout(() => {
        setLoading(true); // Ativar loading geral para reinicialização
        inicializarWhatsApp();
      }, 2000);

    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setStatus('❌ Erro ao desconectar');
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageCircle className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
            <p className="text-gray-600">Conecte seu WhatsApp para enviar mensagens automáticas</p>
          </div>
        </div>

        <div className="text-center py-8">
          {/* APENAS QR CODE quando desconectado */}
          {qrCode && !isConnected && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 object-contain"
                />
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4" />
                <span>Abra o WhatsApp no seu celular e escaneie o código</span>
              </div>
            </div>
          )}

          {/* APENAS DADOS DO PERFIL E BOTÃO quando conectado */}
          {isConnected && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">WhatsApp conectado e pronto para uso!</span>
                  </div>
                  
                  {/* Perfil do WhatsApp */}
                  <div className="flex items-center space-x-4 bg-white rounded-lg p-4 shadow-sm border">
                    {profilePicUrl && (
                      <img 
                        src={profilePicUrl} 
                        alt="Foto do perfil" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                      />
                    )}
                    <div className="text-left">
                      {profileName && (
                        <div className="font-semibold text-gray-900 text-lg">
                          {profileName}
                        </div>
                      )}
                      {phoneNumber && (
                        <div className="text-sm text-gray-600">
                          <span className="font-mono">+{phoneNumber}</span>
                        </div>
                      )}
                      <div className="text-xs text-green-600 mt-1">
                        ● Conectado
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={abrirModalDesconectar}
                disabled={isDisconnecting}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
              </button>
            </div>
          )}

          {/* LOADING apenas quando necessário */}
          {loading && !qrCode && !isConnected && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Preparando conexão...</span>
            </div>
          )}

          {/* Botão manual quando há erro, timeout ou token inválido */}
          {!loading && !qrCode && !isConnected && (status.includes('Token inválido') || status.includes('Erro') || status.includes('Timeout')) && (
            <div className="flex flex-col items-center space-y-4">
              <div className="text-red-600 mb-2 text-center">{status}</div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setLoading(true);
                    setStatus('🔄 Tentando novamente...');
                    if (token) {
                      buscarQRCode(token);
                    } else {
                      criarInstancia();
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
                
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Atualizar Página
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navegação para Templates e Testes - Só aparece quando conectado */}
      {isConnected && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/dashboard/whatsapp/templates"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
                  <p className="text-sm text-gray-600">Configure mensagens automáticas</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>

          <Link
            to="/dashboard/whatsapp/test"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TestTube className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Teste de Mensagens</h3>
                  <p className="text-sm text-gray-600">Teste o envio de mensagens</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        </div>
      )}

      {/* Modal de Confirmação de Desconexão */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Desconectar WhatsApp
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente para reconectar.
              </p>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={fecharModalDesconectar}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDesconectar}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Sim, Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;