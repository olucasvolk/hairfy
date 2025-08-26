const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
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

// WhatsApp clients storage
const whatsappClients = new Map();
const qrCodes = new Map();

console.log('🚀 INICIANDO APP PLATFORM COM LEMBRETES AUTOMÁTICOS...');
console.log('📱 WhatsApp + 🕐 Lembretes + 🌐 Web Interface');

// ========================================
// SISTEMA DE LEMBRETES AUTOMÁTICOS
// ========================================

async function sendAppointmentReminder(appointmentData) {
  try {
    console.log('⏰ Enviando lembrete para:', appointmentData.client_name);

    // Buscar cliente WhatsApp conectado
    const client = whatsappClients.get(appointmentData.barbershop_id);
    if (!client) {
      console.log('❌ Cliente WhatsApp não conectado para:', appointmentData.barbershop_id);
      return { success: false, message: 'WhatsApp não conectado' };
    }

    // Verificar se cliente está pronto
    try {
      const state = await client.getState();
      if (state !== 'CONNECTED') {
        console.log('❌ WhatsApp não está conectado. Estado:', state);
        return { success: false, message: 'WhatsApp não está conectado' };
      }
    } catch (stateError) {
      console.log('❌ Erro ao verificar estado do WhatsApp:', stateError.message);
      return { success: false, message: 'Erro ao verificar conexão WhatsApp' };
    }

    // Buscar template de lembrete
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

    // Processar template
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

    // Preparar número e enviar
    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const chatId = `${finalNumber}@c.us`;

    console.log('📤 Enviando lembrete para:', finalNumber);

    // Verificar se número está registrado
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      console.log('❌ Número não registrado no WhatsApp:', finalNumber);
      return { success: false, message: 'Número não registrado no WhatsApp' };
    }

    // Enviar mensagem
    const result = await client.sendMessage(chatId, processedMessage);
    console.log('✅ Lembrete enviado com sucesso!');

    // Registrar na fila
    await supabase.from('whatsapp_message_queue').insert({
      barbershop_id: appointmentData.barbershop_id,
      phone_number: finalNumber,
      message: processedMessage,
      template_type: 'appointment_reminder',
      appointment_id: appointmentData.id,
      instance_token: 'app_platform',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // Marcar como enviado
    await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appointmentData.id);

    return { success: true, message: `Lembrete enviado para +${finalNumber}` };

  } catch (error) {
    console.error('❌ Erro ao enviar lembrete:', error);
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

        // Aguardar 3 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 3000));

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
// CONFIGURAÇÃO PUPPETEER OTIMIZADA
// ========================================

const getPuppeteerConfig = async () => {
  const config = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--run-all-compositor-stages-before-draw',
      '--memory-pressure-off'
    ]
  };

  // Tentar usar Chromium otimizado se disponível
  try {
    const chromium = require('@sparticuz/chromium');
    config.executablePath = await chromium.executablePath();
    config.args.push(...chromium.args);
    console.log('✅ Usando @sparticuz/chromium otimizado');
  } catch (error) {
    console.log('📦 Usando Chromium padrão do puppeteer-core');
    
    // Fallback: tentar encontrar Chromium no sistema
    const possiblePaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];
    
    for (const path of possiblePaths) {
      if (require('fs').existsSync(path)) {
        config.executablePath = path;
        console.log('🔍 Encontrado Chromium em:', path);
        break;
      }
    }
  }

  return config;
};

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
      service: 'hairfy-app-platform-complete',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: whatsappClients.size > 0 ? 'active' : 'inactive',
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

  // Servir arquivos estáticos do React (se existir build)
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

  // Página inicial com instruções (se não houver build do React)
  if (pathname === '/' && !hasReactBuild) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hairfy - Sistema Completo</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #007acc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>💈 Hairfy - Sistema Completo</h1>
        
        <div class="success">
          <h3>🎉 Sistema Funcionando!</h3>
          <p>✅ WhatsApp Web.js: Ativo</p>
          <p>✅ Lembretes Automáticos: Ativo (a cada hora)</p>
          <p>✅ APIs Completas: Disponíveis</p>
        </div>
        
        <h2>📱 APIs WhatsApp</h2>
        <div class="endpoint"><span class="method">POST</span> /api/whatsapp/connect/{barbershopId}</div>
        <div class="endpoint"><span class="method">GET</span> /api/whatsapp/status/{barbershopId}</div>
        <div class="endpoint"><span class="method">GET</span> /api/whatsapp/qr/{barbershopId}</div>
        <div class="endpoint"><span class="method">POST</span> /api/whatsapp/send/{barbershopId}</div>
        
        <h2>⏰ APIs Lembretes</h2>
        <div class="endpoint"><span class="method">POST</span> /api/reminders/process</div>
        
        <h2>🔧 Sistema</h2>
        <div class="endpoint"><span class="method">GET</span> /health</div>
      </body>
      </html>
    `);
    return;
  }

  // ========================================
  // WHATSAPP APIs (mesmo código anterior)
  // ========================================

  // Conectar WhatsApp
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    if (whatsappClients.has(barbershopId)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Already connected' }));
      return;
    }

    try {
      console.log(`🚀 Conectando WhatsApp para barbearia: ${barbershopId}`);

      const puppeteerConfig = await getPuppeteerConfig();
      
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: barbershopId,
          dataPath: './.wwebjs_auth'
        }),
        puppeteer: puppeteerConfig
      });

      whatsappClients.set(barbershopId, client);

      client.on('qr', (qr) => {
        console.log('📱 QR Code gerado');
        qrCodes.set(barbershopId, qr);
        if (io) io.emit('qr', { barbershopId, qr });
      });

      client.on('ready', () => {
        console.log('✅ WhatsApp conectado!');
        qrCodes.delete(barbershopId);
        if (io) io.emit('ready', { barbershopId });
      });

      client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp desconectado:', reason);
        whatsappClients.delete(barbershopId);
        qrCodes.delete(barbershopId);
        if (io) io.emit('disconnected', { barbershopId, reason });
      });

      await client.initialize();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Connecting...' }));

    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Status do WhatsApp
  if (pathname.startsWith('/api/whatsapp/status/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const client = whatsappClients.get(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: client ? true : false,
      hasQR: qrCodes.has(barbershopId),
      status: client ? 'connected' : 'disconnected'
    }));
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const qr = qrCodes.get(barbershopId);
    
    if (qr) {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ qr: qrImage }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao gerar QR Code' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'QR Code não encontrado' }));
    }
    return;
  }

  // Enviar mensagem
  if (pathname.startsWith('/api/whatsapp/send/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const client = whatsappClients.get(barbershopId);
    
    if (!client) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'WhatsApp não conectado' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        
        const state = await client.getState();
        if (state !== 'CONNECTED') {
          throw new Error(`WhatsApp não está conectado. Estado atual: ${state}`);
        }
        
        const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
        const isRegistered = await client.isRegisteredUser(formattedPhone);
        if (!isRegistered) {
          throw new Error('Número não está registrado no WhatsApp');
        }
        
        const result = await client.sendMessage(formattedPhone, message);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Mensagem enviada',
          messageId: result.id._serialized
        }));
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message
        }));
      }
    });
    return;
  }

  // 404 para outras rotas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

// ========================================
// SOCKET.IO
// ========================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado via Socket.IO');
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado');
  });
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

// Executar uma vez ao iniciar (após 60 segundos)
setTimeout(() => {
  console.log('🧪 Executando verificação inicial de lembretes...');
  processReminders();
}, 60000);

// ========================================
// START SERVER
// ========================================

server.listen(PORT, async () => {
  console.log(`\n🎉 APP PLATFORM COMPLETO INICIADO!`);
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📱 WhatsApp: Ativo`);
  console.log(`⏰ Lembretes: Ativo (a cada hora)`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Lembretes: http://localhost:${PORT}/api/reminders/process`);
  
  // Testar configuração do Chromium
  try {
    const config = await getPuppeteerConfig();
    console.log('🔧 Configuração do Chromium:');
    console.log('   - Executable Path:', config.executablePath || 'Padrão do sistema');
    console.log('   - Args count:', config.args.length);
  } catch (error) {
    console.error('❌ Erro ao verificar Chromium:', error.message);
  }
  
  console.log(`\n✅ Sistema pronto para App Platform!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  
  for (const [barbershopId, client] of whatsappClients) {
    console.log(`📱 Fechando cliente ${barbershopId}`);
    client.destroy();
  }
  
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});