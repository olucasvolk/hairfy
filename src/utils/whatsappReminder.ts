// Sistema de lembretes automáticos WhatsApp
import { supabase } from '../lib/supabase';

interface ReminderAppointment {
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
  barbershop_name: string;
  barbershop_address?: string;
}

export const sendAppointmentReminder = async (
  appointmentData: ReminderAppointment
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('⏰ Iniciando envio de lembrete WhatsApp...', {
      appointmentId: appointmentData.id,
      clientName: appointmentData.client_name,
      appointmentDate: appointmentData.appointment_date
    });

    // 1. Verificar se WhatsApp está conectado
    const { data: whatsappSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('instance_token, is_connected')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .single();

    if (sessionError || !whatsappSession || !whatsappSession.is_connected) {
      console.log('❌ WhatsApp não conectado para lembrete');
      return { success: false, message: 'WhatsApp não conectado' };
    }

    // 2. Buscar template ativo de lembrete
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .eq('template_type', 'appointment_reminder')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.log('❌ Template de lembrete não encontrado');
      return { success: false, message: 'Template de lembrete não configurado' };
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
      '{barbearia_nome}': appointmentData.barbershop_name,
      '{barbearia_endereco}': appointmentData.barbershop_address || 'Endereço não informado'
    };

    // Substituir variáveis
    Object.entries(variables).forEach(([placeholder, value]) => {
      processedMessage = processedMessage.split(placeholder).join(value);
    });

    console.log('📝 Lembrete processado:', processedMessage.substring(0, 100) + '...');

    // 4. Preparar número de telefone
    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    // 5. Enviar lembrete via API
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
    console.log('📤 Resposta do lembrete:', result);

    if (response.ok && result) {
      console.log('✅ Lembrete enviado com sucesso!');
      
      // 6. Registrar na fila de mensagens
      await supabase.from('whatsapp_message_queue').insert({
        barbershop_id: appointmentData.barbershop_id,
        phone_number: finalNumber,
        message: processedMessage,
        template_type: 'appointment_reminder',
        appointment_id: appointmentData.id,
        instance_token: whatsappSession.instance_token,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      // 7. Marcar agendamento como lembrete enviado
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointmentData.id);

      return { 
        success: true, 
        message: `Lembrete enviado para +${finalNumber}` 
      };
    } else {
      throw new Error(result.error || 'Erro na API');
    }

  } catch (error) {
    console.error('❌ Erro ao enviar lembrete:', error);
    
    // Registrar erro na fila
    try {
      await supabase.from('whatsapp_message_queue').insert({
        barbershop_id: appointmentData.barbershop_id,
        phone_number: appointmentData.client_phone,
        message: 'Erro ao processar lembrete',
        template_type: 'appointment_reminder',
        appointment_id: appointmentData.id,
        instance_token: 'error',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        failed_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Erro ao registrar falha do lembrete:', logError);
    }

    return { 
      success: false, 
      message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    };
  }
};

export const processReminders = async (): Promise<{ processed: number; sent: number; errors: number }> => {
  try {
    console.log('🔄 Processando lembretes automáticos...');

    // Buscar agendamentos que precisam de lembrete (24h antes)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        barbershop_id,
        client_name,
        client_phone,
        appointment_date,
        start_time,
        service_name,
        service_price,
        staff_name,
        status,
        reminder_sent,
        barbershops!inner(name, address)
      `)
      .eq('appointment_date', tomorrowStr)
      .in('status', ['agendado', 'confirmado'])
      .eq('reminder_sent', false);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      return { processed: 0, sent: 0, errors: 1 };
    }

    if (!appointments || appointments.length === 0) {
      console.log('ℹ️ Nenhum agendamento para lembrete hoje');
      return { processed: 0, sent: 0, errors: 0 };
    }

    console.log(`📋 Encontrados ${appointments.length} agendamentos para lembrete`);

    let sent = 0;
    let errors = 0;

    // Processar cada agendamento
    for (const appointment of appointments) {
      try {
        const reminderData: ReminderAppointment = {
          id: appointment.id,
          barbershop_id: appointment.barbershop_id,
          client_name: appointment.client_name,
          client_phone: appointment.client_phone,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          service_name: appointment.service_name,
          service_price: appointment.service_price,
          staff_name: appointment.staff_name,
          status: appointment.status,
          barbershop_name: appointment.barbershops.name,
          barbershop_address: appointment.barbershops.address
        };

        const result = await sendAppointmentReminder(reminderData);
        
        if (result.success) {
          sent++;
          console.log(`✅ Lembrete enviado: ${appointment.client_name}`);
        } else {
          errors++;
          console.log(`❌ Falha no lembrete: ${appointment.client_name} - ${result.message}`);
        }

        // Aguardar um pouco entre envios para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (appointmentError) {
        errors++;
        console.error(`❌ Erro no agendamento ${appointment.id}:`, appointmentError);
      }
    }

    console.log(`🎯 Processamento concluído: ${sent} enviados, ${errors} erros`);
    return { processed: appointments.length, sent, errors };

  } catch (error) {
    console.error('❌ Erro geral no processamento de lembretes:', error);
    return { processed: 0, sent: 0, errors: 1 };
  }
};