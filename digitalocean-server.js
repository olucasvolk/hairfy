const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

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
    methods: ["GET", "POST"]
  }
});

// WhatsApp clients storage
const whatsappClients = new Map();

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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

// WhatsApp functions
async function connectWhatsApp(barbershopId, res) {
  try {
    if (whatsappClients.has(barbershopId)) {
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
      console.log(`QR Code gerado para ${barbershopId}`);
      
      // Gerar QR code como imagem
      try {
        const qrImage = await QRCode.toDataURL(qr);
        io.emit(`qr_${barbershopId}`, { qr: qrImage });
      } catch (error) {
        console.error('Erro ao gerar QR code:', error);
      }
    });

    client.on('ready', () => {
      console.log(`WhatsApp conectado para ${barbershopId}`);
      const phoneNumber = client.info.wid.user;
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
    await client.initialize();

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
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    connected: !!isConnected,
    phone: isConnected ? client.info.wid.user : null
  }));
}

// Static file server
function serveStaticFile(req, res, pathname) {
  console.log(`Serving static file: ${pathname}`);
  
  let filePath = path.join(__dirname, 'dist');
  
  if (pathname === '/') {
    filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(filePath, pathname);
  }

  console.log(`File path: ${filePath}`);

  // Security check
  const distPath = path.join(__dirname, 'dist');
  if (!filePath.startsWith(distPath)) {
    console.log('Security check failed - forbidden');
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`File not found: ${filePath}, serving index.html for SPA`);
      // If file not found, serve index.html for SPA
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          console.error('Index.html not found:', indexErr);
          res.writeHead(404);
          res.end('Not Found - Index.html missing');
          return;
        }
        console.log('Serving index.html for SPA');
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
      '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    console.log(`Serving file: ${filePath} with content-type: ${contentType}`);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
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