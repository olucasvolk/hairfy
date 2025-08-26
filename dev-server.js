const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const PORT = 3001;

// WhatsApp clients storage
const whatsappClients = new Map();
const qrCodes = new Map(); // Store QR codes temporarily

// Criar servidor HTTP
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
      service: 'hairfy-whatsapp-dev',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: whatsappClients.size > 0 ? 'active' : 'inactive'
    }));
    return;
  }

  // WhatsApp API endpoints
  if (pathname.startsWith('/api/whatsapp/')) {
    handleWhatsAppAPI(req, res, pathname, method);
    return;
  }

  // Default response for dev
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'WhatsApp Dev Server Running' }));
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// WhatsApp API handler
function handleWhatsAppAPI(req, res, pathname, method) {
  const pathParts = pathname.split('/');
  
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

  if (method === 'POST' && pathParts[3] === 'disconnect') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      disconnectWhatsApp(barbershopId, res);
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

  if (method === 'GET' && pathParts[3] === 'qr') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      getQRCode(barbershopId, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Barbershop ID required' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

// WhatsApp functions
async function connectWhatsApp(barbershopId, res) {
  try {
    console.log(`🔄 Conectando WhatsApp para barbearia: ${barbershopId}`);
    
    if (whatsappClients.has(barbershopId)) {
      console.log(`✅ WhatsApp já conectado para ${barbershopId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Already connected' }));
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: barbershopId,
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
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

      // Gerar QR code como imagem
      try {
        const qrImage = await QRCode.toDataURL(qr);
        qrCodes.set(barbershopId, qrImage);
        
        // Emit via Socket.IO
        io.emit(`qr_${barbershopId}`, { qr: qrImage });
        
        console.log(`💾 QR Code armazenado para ${barbershopId}`);
      } catch (error) {
        console.error('❌ Erro ao gerar QR code:', error);
      }
    });

    client.on('ready', () => {
      console.log(`✅ WhatsApp conectado para ${barbershopId}`);
      const phoneNumber = client.info.wid.user;
      
      // Remove QR code when connected
      qrCodes.delete(barbershopId);
      
      io.emit(`ready_${barbershopId}`, { phone: phoneNumber });
    });

    client.on('authenticated', () => {
      console.log(`🔐 WhatsApp autenticado para ${barbershopId}`);
      io.emit(`authenticated_${barbershopId}`);
    });

    client.on('auth_failure', (msg) => {
      console.error(`❌ Falha na autenticação para ${barbershopId}:`, msg);
      io.emit(`auth_failure_${barbershopId}`, { error: msg });
      whatsappClients.delete(barbershopId);
    });

    client.on('disconnected', (reason) => {
      console.log(`🔌 WhatsApp desconectado para ${barbershopId}:`, reason);
      io.emit(`disconnected_${barbershopId}`, { reason });
      whatsappClients.delete(barbershopId);
      qrCodes.delete(barbershopId);
    });

    whatsappClients.set(barbershopId, client);
    await client.initialize();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Connecting...' }));
  } catch (error) {
    console.error('❌ Erro ao conectar WhatsApp:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function disconnectWhatsApp(barbershopId, res) {
  try {
    console.log(`🔌 Desconectando WhatsApp para ${barbershopId}`);
    
    const client = whatsappClients.get(barbershopId);
    if (client) {
      await client.destroy();
      whatsappClients.delete(barbershopId);
    }
    
    qrCodes.delete(barbershopId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Disconnected' }));
  } catch (error) {
    console.error('❌ Erro ao desconectar WhatsApp:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function sendWhatsAppMessage(barbershopId, data, res) {
  try {
    console.log(`📤 Enviando mensagem para ${barbershopId}:`, data);
    
    const client = whatsappClients.get(barbershopId);
    if (!client) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'WhatsApp not connected' }));
      return;
    }

    const { phone, message } = data;
    if (!phone || !message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Phone and message required' }));
      return;
    }

    // Formatar número
    const formattedPhone = phone.replace(/\D/g, '');
    const chatId = `${formattedPhone}@c.us`;

    await client.sendMessage(chatId, message);
    console.log(`✅ Mensagem enviada para ${phone}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Message sent' }));
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

function getWhatsAppStatus(barbershopId, res) {
  const client = whatsappClients.get(barbershopId);
  const isConnected = client && client.info;
  
  console.log(`📊 Status para ${barbershopId}: ${isConnected ? 'conectado' : 'desconectado'}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    connected: !!isConnected,
    phone: isConnected ? client.info.wid.user : null
  }));
}

function getQRCode(barbershopId, res) {
  const qrImage = qrCodes.get(barbershopId);
  
  console.log(`📱 QR Code para ${barbershopId}: ${qrImage ? 'disponível' : 'não encontrado'}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    qr: qrImage || null,
    hasQR: !!qrImage
  }));
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 WhatsApp Dev Server running on http://localhost:${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/health`);
  console.log(`💬 WhatsApp API: http://localhost:${PORT}/api/whatsapp/`);
  console.log(`\n🔧 Para testar:`);
  console.log(`1. Execute: npm run dev (em outro terminal)`);
  console.log(`2. Acesse: http://localhost:5173`);
  console.log(`3. Vá para: Configurações → WhatsApp`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Disconnect all WhatsApp clients
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
      console.log(`🔌 WhatsApp client ${barbershopId} disconnected`);
    } catch (error) {
      console.error(`❌ Error disconnecting client ${barbershopId}:`, error);
    }
  }
  
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  
  // Disconnect all WhatsApp clients
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
      console.log(`🔌 WhatsApp client ${barbershopId} disconnected`);
    } catch (error) {
      console.error(`❌ Error disconnecting client ${barbershopId}:`, error);
    }
  }
  
  process.exit(0);
});