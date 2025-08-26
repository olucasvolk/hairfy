const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');

const PORT = process.env.PORT || 3001;

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
      service: 'hairfy-whatsapp',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: whatsappClients.size > 0 ? 'active' : 'inactive'
    }));
    return;
  }

  // Debug endpoint
  if (pathname === '/debug' || pathname === '/api/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      activeClients: Array.from(whatsappClients.keys()),
      qrCodes: Array.from(qrCodes.keys()),
      clientsCount: whatsappClients.size,
      qrCodesCount: qrCodes.size,
      uptime: process.uptime()
    }));
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

// Socket.IO setup
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

// WhatsApp API handler
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

  if (method === 'POST' && pathParts[3] === 'reset') {
    const barbershopId = pathParts[4];
    if (barbershopId) {
      resetWhatsApp(barbershopId, res);
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
    console.log(`🔄 [${new Date().toISOString()}] Tentativa de conexão para: ${barbershopId}`);

    if (whatsappClients.has(barbershopId)) {
      const client = whatsappClients.get(barbershopId);
      const isReady = client && client.info;

      console.log(`⚠️ [${barbershopId}] Cliente já existe. Status: ${isReady ? 'READY' : 'NOT_READY'}`);

      if (!isReady) {
        console.log(`🔄 [${barbershopId}] Cliente existe mas não está pronto. Removendo e reconectando...`);
        try {
          await client.destroy();
        } catch (e) {
          console.log(`⚠️ [${barbershopId}] Erro ao destruir cliente antigo:`, e.message);
        }
        whatsappClients.delete(barbershopId);
        qrCodes.delete(barbershopId);
        // Continue with new connection below
      } else {
        console.log(`✅ [${barbershopId}] Cliente já conectado e pronto`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Already connected' }));
        return;
      }
    }

    console.log(`🚀 [${barbershopId}] Criando novo cliente WhatsApp...`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: barbershopId,
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        // No App Platform, usar o Chromium incluído no Puppeteer
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
          '--run-all-compositor-stages-before-draw',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-ipc-flooding-protection'
        ]
      }
    });

    console.log(`📝 [${barbershopId}] Cliente criado, configurando eventos...`);

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
      console.log(`WhatsApp autenticado para ${barbershopId}`);
      io.emit(`authenticated_${barbershopId}`);
    });

    client.on('auth_failure', (msg) => {
      console.error(`Falha na autenticação para ${barbershopId}:`, msg);
      io.emit(`auth_failure_${barbershopId}`, { error: msg });
      whatsappClients.delete(barbershopId);
    });

    client.on('disconnected', (reason) => {
      console.log(`WhatsApp desconectado para ${barbershopId}:`, reason);
      io.emit(`disconnected_${barbershopId}`, { reason });
      whatsappClients.delete(barbershopId);
    });

    whatsappClients.set(barbershopId, client);
    console.log(`💾 [${barbershopId}] Cliente armazenado no Map`);

    console.log(`🔄 [${barbershopId}] Iniciando cliente...`);
    await client.initialize();

    console.log(`✅ [${barbershopId}] Cliente inicializado com sucesso`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Connecting...' }));
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function disconnectWhatsApp(barbershopId, res) {
  try {
    const client = whatsappClients.get(barbershopId);
    if (client) {
      await client.destroy();
      whatsappClients.delete(barbershopId);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Disconnected' }));
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function sendWhatsAppMessage(barbershopId, data, res) {
  try {
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

async function resetWhatsApp(barbershopId, res) {
  try {
    console.log(`🔄 [${barbershopId}] RESET solicitado`);

    // Remove client if exists
    const client = whatsappClients.get(barbershopId);
    if (client) {
      console.log(`🗑️ [${barbershopId}] Destruindo cliente existente...`);
      try {
        await client.destroy();
      } catch (e) {
        console.log(`⚠️ [${barbershopId}] Erro ao destruir:`, e.message);
      }
      whatsappClients.delete(barbershopId);
    }

    // Remove QR code
    qrCodes.delete(barbershopId);

    console.log(`✅ [${barbershopId}] Reset concluído`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Reset completed' }));
  } catch (error) {
    console.error(`❌ [${barbershopId}] Erro no reset:`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Static file server
function serveStaticFile(req, res, pathname) {
  let filePath = path.join(__dirname, 'dist');

  if (pathname === '/') {
    filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(filePath, pathname);
  }

  // Security check
  const distPath = path.join(__dirname, 'dist');
  if (!filePath.startsWith(distPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file not found, serve index.html for SPA
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          console.error('Index.html not found:', indexErr);
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 [${new Date().toISOString()}] Cliente conectado:`, socket.id);

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [${new Date().toISOString()}] Cliente desconectado:`, socket.id, 'Razão:', reason);
  });

  socket.on('error', (error) => {
    console.error(`❌ [${new Date().toISOString()}] Erro no socket:`, socket.id, error);
  });
});

io.on('error', (error) => {
  console.error(`❌ [${new Date().toISOString()}] Erro no Socket.IO:`, error);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DigitalOcean Server running on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/health`);
  console.log(`💬 WhatsApp API: http://localhost:${PORT}/api/whatsapp/`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Disconnect all WhatsApp clients
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
      console.log(`WhatsApp client ${barbershopId} disconnected`);
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

  // Disconnect all WhatsApp clients
  for (const [barbershopId, client] of whatsappClients) {
    try {
      await client.destroy();
      console.log(`WhatsApp client ${barbershopId} disconnected`);
    } catch (error) {
      console.error(`Error disconnecting client ${barbershopId}:`, error);
    }
  }

  process.exit(0);
});