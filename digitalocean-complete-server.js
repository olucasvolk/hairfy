// SERVIDOR COMPLETO PARA DIGITAL OCEAN
// WhatsApp + Lembretes + Web Interface
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3001;

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp clients storage
const whatsappClients = new Map();
const qrCodes = new Map();

console.log('🚀 INICIANDO SERVIDOR COMPLETO DIGITAL OCEAN...');
console.log('📱 WhatsApp + 🕐 Lembretes + 🌐 Web Interface');

// ========================================
// SISTEMA DE LEMBRETES AUTOMÁTICOS
// ========================================

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

    // 4. Enviar via WhatsApp Web.js (servidor local)
    const client = whatsappClients.get(appointmentData.barbershop_id);
    if (!client || !client.info) {
      console.log('❌ Cliente WhatsApp não conectado localmente');
      return { success: false, message: 'Cliente WhatsApp não conectado' };
    }

    const cleanNumber = appointmentData.client_phone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const chatId = `${finalNumber}@c.us`;

    await client.sendMessage(chatId, processedMessage);

    // 5. Registrar na fila
    await supabase.from('whatsapp_message_queue').insert({
      barbershop_id: appointmentData.barbershop_id,
      phone_number: finalNumber,
      message: processedMessage,
      template_type: 'appointment_reminder',
      appointment_id: appointmentData.id,
      instance_token: 'local_server',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // 6. Marcar como enviado
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

const server = http.createServer((req, res) => {
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
      service: 'hairfy-complete',
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

  // WhatsApp API endpoints
  if (pathname.startsWith('/api/whatsapp/')) {
    handleWhatsAppAPI(req, res, pathname, method);
    return;
  }

  // Serve static files
  serveStaticFile(req, res, pathname);
});

// ========================================
// WHATSAPP FUNCTIONS (mesmo código anterior)
// ========================================

function handleWhatsAppAPI(req, res, pathname, method) {
  const pathParts = pathname.split('/');
  console.log(`🔧 WhatsApp API: ${method} ${pathname}`);

  if (method === 'POST' && pathParts[3] === 'connect') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      connectWhatsApp(barbershopId, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Barbershop ID required' }));
    }
    return;
  }

  if (method === 'POST' && pathParts[3] === 'send') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          sendWhatsAppMessage(barbershopId, data, res);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Barbershop ID required' }));
    }
    return;
  }

  if (method === 'GET' && pathParts[3] === 'status') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      getWhatsAppStatus(barbershopId, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Barbershop ID required' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

async function connectWhatsApp(barbershopId, res) {
  try {
    console.log(`🔄 Conectando WhatsApp para: ${barbershopId}`);

    if (whatsappClients.has(barbershopId)) {
      const client = whatsappClients.get(barbershopId);
      const isReady = client && client.info;

      if (isReady) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Already connected' }));
        return;
      } else {
        try {
          await client.destroy();
        } catch (e) {
          console.log(`⚠️ Erro ao destruir cliente antigo:`, e.message);
        }
        whatsappClients.delete(barbershopId);
        qrCodes.delete(barbershopId);
      }
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: barbershopId,
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    client.on('qr', async (qr) => {
      console.log(`📱 QR Code gerado para ${barbershopId}`);
      try {
        const qrImage = await QRCode.toDataURL(qr);
        qrCodes.set(barbershopId, qrImage);
        io.emit(`qr_${barbershopId}`, { qr: qrImage });
      } catch (error) {
        console.error('❌ Erro ao gerar QR code:', error);
      }
    });

    client.on('ready', () => {
      console.log(`✅ WhatsApp conectado para ${barbershopId}`);
      const phoneNumber = client.info.wid.user;
      qrCodes.delete(barbershopId);
      io.emit(`ready_${barbershopId}`, { phone: phoneNumber });
    });

    client.on('disconnected', (reason) => {
      console.log(`WhatsApp desconectado para ${barbershopId}:`, reason);
      whatsappClients.delete(barbershopId);
    });

    whatsappClients.set(barbershopId, client);
    await client.initialize();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Connecting...' }));
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function sendWhatsAppMessage(barbershopId, data, res) {
  try {
    const client = whatsappClients.get(barbershopId);
    if (!client || !client.info) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'WhatsApp not connected' }));
      return;
    }

    const { phone, message } = data;
    const formattedPhone = phone.replace(/\D/g, '');
    const chatId = `${formattedPhone}@c.us`;

    await client.sendMessage(chatId, message);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Message sent' }));
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

function getWhatsAppStatus(barbershopId, res) {
  const client = whatsappClients.get(barbershopId);
  const isConnected = client && client.info;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    connected: !!isConnected,
    phone: isConnected ? client.info.wid.user : null
  }));
}

// ========================================
// STATIC FILE SERVER
// ========================================

function serveStaticFile(req, res, pathname) {
  let filePath = path.join(__dirname, 'dist');

  if (pathname === '/') {
    filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(filePath, pathname);
  }

  const distPath = path.join(__dirname, 'dist');
  if (!filePath.startsWith(distPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ========================================
// SOCKET.IO SETUP
// ========================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado:`, socket.id);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎉 SERVIDOR COMPLETO INICIADO!`);
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📱 WhatsApp: Ativo`);
  console.log(`⏰ Lembretes: Ativo (a cada hora)`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Lembretes: http://localhost:${PORT}/api/reminders/process`);
  console.log(`\n✅ Sistema pronto para produção no Digital Ocean!`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
    } catch (error) {
      console.error(`Error disconnecting client ${barbershopId}:`, error);
    }
  }
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
    } catch (error) {
      console.error(`Error disconnecting client ${barbershopId}:`, error);
    }
  }
  process.exit(0);
});