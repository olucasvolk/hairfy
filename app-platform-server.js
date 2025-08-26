const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase para lembretes
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// WhatsApp clients storage
const whatsappClients = new Map();
const qrCodes = new Map();

// Configuração otimizada para App Platform
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
    
    for (const chromiumPath of possiblePaths) {
      if (fs.existsSync(chromiumPath)) {
        config.executablePath = chromiumPath;
        console.log('🔍 Encontrado Chromium em:', chromiumPath);
        break;
      }
    }
  }

  return config;
};

// Função para processar lembretes
async function processReminders() {
  try {
    console.log('🔍 Processando lembretes...');
    
    // Buscar agendamentos para amanhã que ainda não tiveram lembrete enviado
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (name, phone),
        services (name, duration),
        staff (name)
      `)
      .gte('date', tomorrow.toISOString())
      .lt('date', dayAfterTomorrow.toISOString())
      .eq('status', 'confirmed')
      .is('reminder_sent', false);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('📅 Nenhum agendamento encontrado para amanhã');
      return;
    }

    console.log(`📋 Encontrados ${appointments.length} agendamentos para processar`);

    // Processar cada agendamento
    for (const appointment of appointments) {
      try {
        if (!appointment.clients?.phone) {
          console.log(`⚠️ Cliente sem telefone: ${appointment.clients?.name || 'N/A'}`);
          continue;
        }

        const phone = appointment.clients.phone.replace(/\D/g, '');
        const formattedPhone = phone.length === 11 ? `55${phone}@c.us` : `${phone}@c.us`;
        
        const appointmentDate = new Date(appointment.date);
        const timeStr = appointmentDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const message = `🏪 *Lembrete de Agendamento*\n\n` +
          `Olá ${appointment.clients.name}! 👋\n\n` +
          `Você tem um agendamento marcado para *amanhã*:\n\n` +
          `📅 *Data:* ${appointmentDate.toLocaleDateString('pt-BR')}\n` +
          `⏰ *Horário:* ${timeStr}\n` +
          `💇 *Serviço:* ${appointment.services?.name || 'N/A'}\n` +
          `👨‍💼 *Profissional:* ${appointment.staff?.name || 'N/A'}\n\n` +
          `Nos vemos em breve! 😊`;

        // Tentar enviar via WhatsApp (se houver cliente conectado)
        let messageSent = false;
        for (const [instanceId, client] of whatsappClients) {
          if (client.info && client.info.wid) {
            try {
              await client.sendMessage(formattedPhone, message);
              console.log(`✅ Lembrete enviado para ${appointment.clients.name} (${phone})`);
              messageSent = true;
              break;
            } catch (error) {
              console.error(`❌ Erro ao enviar para ${phone}:`, error.message);
            }
          }
        }

        // Marcar como enviado independentemente do sucesso
        await supabase
          .from('appointments')
          .update({ 
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', appointment.id);

        if (messageSent) {
          console.log(`📝 Marcado como enviado: ${appointment.clients.name}`);
        } else {
          console.log(`⚠️ Marcado como processado (sem WhatsApp ativo): ${appointment.clients.name}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar agendamento ${appointment.id}:`, error);
      }
    }

    console.log('✅ Processamento de lembretes concluído');

  } catch (error) {
    console.error('❌ Erro geral no processamento de lembretes:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  const whatsappStatus = whatsappClients.size > 0 ? 'active' : 'inactive';
  res.json({
    status: 'ok',
    service: 'hairfy-whatsapp-app-platform-reminders',
    whatsapp: whatsappStatus,
    reminders: 'active',
    clients: whatsappClients.size
  });
});

// API para processar lembretes manualmente
app.post('/api/reminders/process', async (req, res) => {
  try {
    await processReminders();
    res.json({ success: true, message: 'Lembretes processados com sucesso' });
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API WhatsApp - Inicializar cliente
app.post('/api/whatsapp/init/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  
  try {
    if (whatsappClients.has(instanceId)) {
      return res.json({ success: false, message: 'Cliente já existe' });
    }

    const config = await getPuppeteerConfig();
    
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: instanceId }),
      puppeteer: config,
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    whatsappClients.set(instanceId, client);

    client.on('qr', (qr) => {
      console.log(`QR Code gerado para ${instanceId}`);
      qrCodes.set(instanceId, qr);
      io.emit('qr', { instanceId, qr });
    });

    client.on('ready', () => {
      console.log(`Cliente ${instanceId} está pronto!`);
      qrCodes.delete(instanceId);
      io.emit('ready', { instanceId });
    });

    client.on('authenticated', () => {
      console.log(`Cliente ${instanceId} autenticado`);
      io.emit('authenticated', { instanceId });
    });

    client.on('disconnected', (reason) => {
      console.log(`Cliente ${instanceId} desconectado:`, reason);
      whatsappClients.delete(instanceId);
      qrCodes.delete(instanceId);
      io.emit('disconnected', { instanceId, reason });
    });

    await client.initialize();
    
    res.json({ success: true, message: 'Cliente inicializado' });
  } catch (error) {
    console.error(`Erro ao inicializar cliente ${instanceId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API WhatsApp - Obter QR Code
app.get('/api/whatsapp/qr/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  const qr = qrCodes.get(instanceId);
  
  if (!qr) {
    return res.status(404).json({ success: false, message: 'QR Code não encontrado' });
  }

  try {
    const qrImage = await QRCode.toDataURL(qr);
    res.json({ success: true, qr: qrImage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API WhatsApp - Status do cliente
app.get('/api/whatsapp/status/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const client = whatsappClients.get(instanceId);
  
  if (!client) {
    return res.json({ success: false, status: 'not_found' });
  }

  const hasQR = qrCodes.has(instanceId);
  const isReady = client.info && client.info.wid;
  
  res.json({
    success: true,
    status: isReady ? 'ready' : (hasQR ? 'qr_code' : 'initializing'),
    hasQR,
    isReady
  });
});

// Servir React app para todas as outras rotas
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App não encontrado. Execute npm run build primeiro.');
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp + Lembretes rodando na porta ${PORT}`);
  console.log(`📱 App Platform otimizado para WhatsApp Web + Lembretes Automáticos`);
  
  // Testar configuração do Chromium
  getPuppeteerConfig().then(config => {
    console.log('🔧 Configuração do Chromium:');
    console.log('   - Executable Path:', config.executablePath || 'Padrão do sistema');
    console.log('   - Args count:', config.args.length);
  }).catch(error => {
    console.error('❌ Erro ao verificar Chromium:', error.message);
  });
  
  // Configurar cron job para lembretes
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
  
  console.log('✅ Sistema de lembretes ativo!');
});