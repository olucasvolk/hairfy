// Debug detalhado do WhatsApp
import { supabase } from '../lib/supabase';

export const debugWhatsAppSetup = async (barbershopId: string) => {
  console.log('🔍 INICIANDO DEBUG WHATSAPP...');
  console.log('Barbershop ID:', barbershopId);

  try {
    // 1. Verificar sessão WhatsApp
    console.log('\n1️⃣ Verificando sessão WhatsApp...');
    const { data: whatsappSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    if (sessionError) {
      console.error('❌ Erro ao buscar sessão:', sessionError);
      return { success: false, error: 'Sessão não encontrada' };
    }

    if (!whatsappSession) {
      console.error('❌ Nenhuma sessão encontrada');
      return { success: false, error: 'WhatsApp não configurado' };
    }

    console.log('✅ Sessão encontrada:', {
      instance_token: whatsappSession.instance_token ? 'Presente' : 'Ausente',
      is_connected: whatsappSession.is_connected,
      phone_number: whatsappSession.phone_number
    });

    // 2. Verificar template
    console.log('\n2️⃣ Verificando template de confirmação...');
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('template_type', 'appointment_confirmed')
      .eq('is_active', true)
      .single();

    if (templateError) {
      console.error('❌ Erro ao buscar template:', templateError);
      return { success: false, error: 'Template não encontrado' };
    }

    if (!template) {
      console.error('❌ Nenhum template ativo encontrado');
      return { success: false, error: 'Template de confirmação não configurado' };
    }

    console.log('✅ Template encontrado:', {
      name: template.name,
      preview: template.message.substring(0, 100) + '...'
    });

    // 3. Testar API WhatsApp
    console.log('\n3️⃣ Testando conexão com API WhatsApp...');
    try {
      const response = await fetch('https://hairfycombr.uazapi.com/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'token': whatsappSession.instance_token
        }
      });

      const result = await response.json();
      console.log('📡 Status da API:', result);

      if (response.ok) {
        console.log('✅ API WhatsApp respondendo');
      } else {
        console.error('❌ API WhatsApp com erro:', result);
        return { success: false, error: 'API WhatsApp não está respondendo' };
      }
    } catch (apiError) {
      console.error('❌ Erro ao conectar com API:', apiError);
      return { success: false, error: 'Erro de conexão com API' };
    }

    // 4. Verificar últimas mensagens na fila
    console.log('\n4️⃣ Verificando fila de mensagens...');
    const { data: messageQueue, error: queueError } = await supabase
      .from('whatsapp_message_queue')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (queueError) {
      console.error('❌ Erro ao buscar fila:', queueError);
    } else {
      console.log('📋 Últimas mensagens na fila:', messageQueue);
    }

    console.log('\n✅ DEBUG CONCLUÍDO - Tudo configurado corretamente!');
    return { 
      success: true, 
      session: whatsappSession, 
      template: template,
      messageQueue: messageQueue 
    };

  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

export const testWhatsAppMessage = async (
  barbershopId: string, 
  phoneNumber: string, 
  testMessage: string = 'Teste de mensagem do sistema'
) => {
  console.log('🧪 TESTANDO ENVIO DE MENSAGEM...');
  
  try {
    // Buscar token
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('instance_token')
      .eq('barbershop_id', barbershopId)
      .single();

    if (!session?.instance_token) {
      throw new Error('Token não encontrado');
    }

    // Preparar número
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    console.log('📱 Enviando para:', finalNumber);

    // Enviar mensagem
    const response = await fetch('https://hairfycombr.uazapi.com/send/text', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': session.instance_token
      },
      body: JSON.stringify({
        number: finalNumber,
        text: testMessage
      })
    });

    const result = await response.json();
    console.log('📤 Resposta do teste:', result);

    return { success: response.ok, result };

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};