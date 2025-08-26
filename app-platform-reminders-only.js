// SERVIDOR APP PLATFORM - APENAS LEMBRETES + WEB
// Usa API UAZ existente para WhatsApp, adiciona lembretes automáticos

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

const PORT = process.env.PORT || 3001;

console.log('🚀 INICIANDO APP PLATFORM COM LEMBRETES...');
console.log('📱 UAZ API + 🕐 Lembretes + 🌐 Web Interface');

// ========================================
// SISTEMA DE LEMBRETES AUTOMÁTICOS
// ========================================

async function sendAppointmentReminder(appointmentData) {
  try {
    console.log('⏰ Enviando lembrete para:', appointmentData.client_name);

    // 1. Buscar sessão WhatsApp (UAZ API)
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

    // 4. Preparar número e enviar via UAZ API
    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    console.log('📤 Enviando lembrete via UAZ API para:', finalNumber);

    // 5. Enviar via UAZ API
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
    console.log('📤 Resposta da UAZ API:', result);

    if (response.ok && result) {
      console.log('✅ Lembrete enviado com sucesso!');
      
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
      throw new Error(result.error || 'Erro na UAZ API');
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
        error_message: error.message,
        failed_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Erro ao registrar falha:', logError);
    }

    return { success: false, message: error.message };
  }
}

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

// ========================================
// SERVIDOR HTTP PRINCIPAL
// ========================================

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'hairfy-app-platform-reminders',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: 'uaz-api',
      reminders: 'active'
    }));
    return;
  }

  // API para processar lembretes manualmente
  if (pathname === '/api/reminders/process' && method === 'POST') {
    processReminders().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Lembretes processados' }));
    }).catch(error => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });
    return;
  }

  // Servir arquivos estáticos do React
  if (hasReactBuild && !pathname.startsWith('/api/')) {
    let filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distPath, 'index.html');
    }
    
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (error) {
      console.error('Erro ao servir arquivo:', error);
    }
  }

  // Página inicial (se não houver build do React)
  if (pathname === '/' && !hasReactBuild) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hairfy - Sistema com Lembretes</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #007acc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>💈 Hairfy - Sistema com Lembretes</h1>
        
        <div class="success">
          <h3>🎉 Sistema Funcionando!</h3>
          <p>✅ WhatsApp UAZ API: Ativo</p>
          <p>✅ Lembretes Automáticos: Ativo (a cada hora)</p>
          <p>✅ Interface Web: Pronta para build</p>
        </div>
        
        <h2>⏰ APIs Lembretes</h2>
        <div class="endpoint"><span class="method">POST</span> /api/reminders/process - Processar lembretes manualmente</div>
        
        <h2>🔧 Sistema</h2>
        <div class="endpoint"><span class="method">GET</span> /health - Status do sistema</div>
        
        <p><strong>Próximo passo:</strong> Faça o build do React para ver a interface completa.</p>
      </body>
      </html>
    `);
    return;
  }

  // 404 para outras rotas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

// ========================================
// CRON JOB PARA LEMBRETES
// ========================================

console.log('⏰ Configurando cron job para lembretes...');

// Rodar a cada hora (minuto 0)
cron.schedule('0 * * * *', () => {
  console.log('🕐 Cron job executado - processando lembretes...');
  processReminders();
});

// Executar uma vez ao iniciar (após 30 segundos)
setTimeout(() => {
  console.log('🧪 Executando verificação inicial de lembretes...');
  processReminders();
}, 30000);

// ========================================
// START SERVER
// ========================================

server.listen(PORT, () => {
  console.log(`\n🎉 APP PLATFORM COM LEMBRETES INICIADO!`);
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📱 WhatsApp: UAZ API (existente)`);
  console.log(`⏰ Lembretes: Ativo (a cada hora)`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Lembretes: http://localhost:${PORT}/api/reminders/process`);
  console.log(`\n✅ Sistema pronto para App Platform!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});