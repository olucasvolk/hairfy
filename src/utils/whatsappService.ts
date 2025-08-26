// Serviço para envio de mensagens WhatsApp
import { supabase } from '../lib/supabase';

interface AppointmentData {
  id: string;
  barbershop_id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  start_time: string;
  service_name: string;
  service_price: number;
  staff_name: string;
  status: string;
}

interface BarbershopData {
  name: string;
  address?: string;
}

export const sendAppointmentConfirmation = async (
  appointmentData: AppointmentData,
  barbershopData: BarbershopData
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('📱 INICIANDO ENVIO DE CONFIRMAÇÃO WHATSAPP...');
    console.log('📋 Dados do agendamento:', {
      appointmentId: appointmentData.id,
      barbershopId: appointmentData.barbershop_id,
      clientName: appointmentData.client_name,
      clientPhone: appointmentData.client_phone,
      status: appointmentData.status,
      serviceName: appointmentData.service_name,
      servicePrice: appointmentData.service_price
    });
    console.log('🏪 Dados da barbearia:', barbershopData);

    // 1. Verificar se WhatsApp está conectado
    const { data: whatsappSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('instance_token, is_connected')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .single();

    if (sessionError || !whatsappSession) {
      console.log('❌ Sessão WhatsApp não encontrada');
      return { success: false, message: 'WhatsApp não configurado' };
    }

    if (!whatsappSession.is_connected || !whatsappSession.instance_token) {
      console.log('❌ WhatsApp não está conectado');
      return { success: false, message: 'WhatsApp não está conectado' };
    }

    // 2. Buscar template ativo de confirmação
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .eq('template_type', 'appointment_confirmed')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.log('❌ Template de confirmação não encontrado');
      return { success: false, message: 'Template de confirmação não configurado' };
    }

    // 3. Processar template com dados do agendamento
    let processedMessage = template.message;
    
    // Formatar data
    const formattedDate = new Date(appointmentData.appointment_date).toLocaleDateString('pt-BR');
    
    // Formatar preço
    const formattedPrice = (appointmentData.service_price / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Substituir variáveis
    const variables = {
      '{cliente_nome}': appointmentData.client_name,
      '{data}': formattedDate,
      '{horario}': appointmentData.start_time,
      '{servico}': appointmentData.service_name,
      '{preco}': formattedPrice,
      '{profissional}': appointmentData.staff_name,
      '{barbearia_nome}': barbershopData.name,
      '{barbearia_endereco}': barbershopData.address || 'Endereço não informado'
    };

    // Substituir variáveis de forma mais simples e eficiente
    Object.entries(variables).forEach(([placeholder, value]) => {
      processedMessage = processedMessage.split(placeholder).join(value);
    });

    console.log('📝 Mensagem processada:', processedMessage.substring(0, 100) + '...');

    // 4. Preparar número de telefone
    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    // 5. Enviar mensagem via API
    const response = await fetch('https://hairfycombr.uazapi.com/send/text', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': whatsappSession.instance_token
      },
      body: JSON.stringify({
        number: finalNumber,
        text: processedMessage
      })
    });

    const result = await response.json();
    console.log('📤 Resposta da API WhatsApp:', result);

    if (response.ok && result) {
      console.log('✅ Mensagem de confirmação enviada com sucesso!');
      
      // 6. Registrar na fila de mensagens para histórico
      await supabase.from('whatsapp_message_queue').insert({
        barbershop_id: appointmentData.barbershop_id,
        phone_number: finalNumber,
        message: processedMessage,
        template_type: 'appointment_confirmed',
        appointment_id: appointmentData.id,
        instance_token: whatsappSession.instance_token,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return { 
        success: true, 
        message: `Confirmação enviada para +${finalNumber}` 
      };
    } else {
      throw new Error(result.error || 'Erro desconhecido da API');
    }

  } catch (error) {
    console.error('❌ Erro ao enviar confirmação WhatsApp:', error);
    
    // Registrar erro na fila
    try {
      await supabase.from('whatsapp_message_queue').insert({
        barbershop_id: appointmentData.barbershop_id,
        phone_number: appointmentData.client_phone,
        message: 'Erro ao processar mensagem',
        template_type: 'appointment_confirmed',
        appointment_id: appointmentData.id,
        instance_token: 'error',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        failed_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Erro ao registrar falha:', logError);
    }

    return { 
      success: false, 
      message: `Erro ao enviar: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    };
  }
};