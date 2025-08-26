// Servidor de lembretes automáticos WhatsApp
// Roda a cada hora verificando agendamentos para o dia seguinte

const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para enviar lembrete
async function sendAppointmentReminder(appointmentData) {
  try {
    console.log('⏰ Enviando lembrete para:', appointmentData.client_name);

    // 1. Buscar sessão WhatsApp
    const { data: whatsappSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('instance_token, is_connected')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .single();

    if (sessionError || !whatsappSession || !whatsappSession.is_connected) {
      console.log('❌ WhatsApp não conectado');
      return { success: false, message: 'WhatsApp não conectado' };
    }

    // 2. Buscar template de lembrete
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('barbershop_id', appointmentData.barbershop_id)
      .eq('template_type', 'appointment_reminder')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.log('❌ Template de lembrete não encontrado');
      return { success: false, message: 'Template não encontrado' };
    }

    // 3. Processar template
    let processedMessage = template.message;
    
    const formattedDate = new Date(appointmentData.appointment_date).toLocaleDateString('pt-BR');
    const formattedPrice = (appointmentData.service_price / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

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

    Object.entries(variables).forEach(([placeholder, value]) => {
      processedMessage = processedMessage.split(placeholder).join(value);
    });

    // 4. Preparar número
    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    // 5. Enviar via API
    const response = await fetch('https://hairfycombr.uazapi.com/send/text', {
      method: 'POST',
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

    if (response.ok && result) {
      // 6. Registrar na fila
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

      // 7. Marcar como enviado
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointmentData.id);

      return { success: true, message: `Lembrete enviado para +${finalNumber}` };
    } else {
      throw new Error(result.error || 'Erro na API');
    }

  } catch (error) {
    console.error('❌ Erro ao enviar lembrete:', error);
    return { success: false, message: error.message };
  }
}

// Função principal de processamento
async function processReminders() {
  try {
    console.log('\n🔄 PROCESSANDO LEMBRETES AUTOMÁTICOS...');
    console.log('⏰ Horário:', new Date().toLocaleString('pt-BR'));

    // Calcular data de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('📅 Buscando agendamentos para:', tomorrowStr);

    // Buscar agendamentos que precisam de lembrete
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
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('ℹ️ Nenhum agendamento para lembrete');
      return;
    }

    console.log(`📋 Encontrados ${appointments.length} agendamentos para lembrete`);

    let sent = 0;
    let errors = 0;

    // Processar cada agendamento
    for (const appointment of appointments) {
      try {
        const reminderData = {
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
          console.log(`✅ ${appointment.client_name} - ${result.message}`);
        } else {
          errors++;
          console.log(`❌ ${appointment.client_name} - ${result.message}`);
        }

        // Aguardar 2 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (appointmentError) {
        errors++;
        console.error(`❌ Erro no agendamento ${appointment.id}:`, appointmentError);
      }
    }

    console.log(`\n🎯 PROCESSAMENTO CONCLUÍDO:`);
    console.log(`   📤 Enviados: ${sent}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📊 Total: ${appointments.length}`);

  } catch (error) {
    console.error('❌ Erro geral no processamento:', error);
  }
}

// Configurar cron job para rodar a cada hora
console.log('🚀 SERVIDOR DE LEMBRETES INICIADO');
console.log('⏰ Verificando lembretes a cada hora...');

// Rodar a cada hora (minuto 0)
cron.schedule('0 * * * *', () => {
  processReminders();
});

// Rodar também ao iniciar o servidor (para teste)
setTimeout(() => {
  console.log('🧪 Executando verificação inicial...');
  processReminders();
}, 5000);

// Manter o servidor rodando
process.on('SIGINT', () => {
  console.log('\n👋 Servidor de lembretes finalizado');
  process.exit(0);
});

console.log('✅ Servidor configurado e rodando!');
console.log('📝 Logs aparecerão aqui quando houver lembretes para enviar');