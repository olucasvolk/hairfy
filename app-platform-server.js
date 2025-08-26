const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3001;

// WhatsApp clients storage
const whatsappClients = new Map();
const qrCodes = new Map();

// Configuração otimizada para App Platform
const getPuppeteerConfig = () => {
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
      '--disable-features=VizDisplayCompositor'
    ]
  };

  // Tentar usar Chromium otimizado se disponível
  try {
    const chromium = require('@sparticuz/chromium');
    config.executablePath = chromium.executablePath;
    console.log('✅ Usando @sparticuz/chromium otimizado');
  } catch (error) {
    console.log('📦 Usando Chromium padrão do puppeteer-core');
  }

  return config;
};

// Criar servidor HTTP
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
      service: 'hairfy-whatsapp-app-platform',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: whatsappClients.size > 0 ? 'active' : 'inactive'
    }));
    return;
  }

  // Inicializar WhatsApp
  if (pathname === '/api/whatsapp/init' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { barbershopId } = JSON.parse(body);
        
        if (whatsappClients.has(barbershopId)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Cliente já inicializado' }));
          return;
        }

        console.log(`🚀 Inicializando WhatsApp para barbearia: ${barbershopId}`);

        const client = new Client({
          authStrategy: new LocalAuth({
            clientId: barbershopId,
            dataPath: './.wwebjs_auth'
          }),
          puppeteer: getPuppeteerConfig()
        });

        whatsappClients.set(barbershopId, client);

        client.on('qr', (qr) => {
          console.log('📱 QR Code gerado');
          qrCodes.set(barbershopId, qr);
          
          // Emitir via Socket.IO se disponível
          if (io) {
            io.emit('qr', { barbershopId, qr });
          }
        });

        client.on('ready', () => {
          console.log('✅ WhatsApp conectado!');
          qrCodes.delete(barbershopId);
          
          if (io) {
            io.emit('ready', { barbershopId });
          }
        });

        client.on('disconnected', (reason) => {
          console.log('❌ WhatsApp desconectado:', reason);
          whatsappClients.delete(barbershopId);
          qrCodes.delete(barbershopId);
          
          if (io) {
            io.emit('disconnected', { barbershopId, reason });
          }
        });

        await client.initialize();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Inicialização iniciada' }));

      } catch (error) {
        console.error('❌ Erro ao inicializar WhatsApp:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Obter QR Code
  if (pathname === '/api/whatsapp/qr' && method === 'GET') {
    const barbershopId = parsedUrl.query.barbershopId;
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

  // Status do WhatsApp
  if (pathname === '/api/whatsapp/status' && method === 'GET') {
    const barbershopId = parsedUrl.query.barbershopId;
    const client = whatsappClients.get(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: client ? true : false,
      hasQR: qrCodes.has(barbershopId)
    }));
    return;
  }

  // 404 para outras rotas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

// Socket.IO
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

server.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 App Platform otimizado para WhatsApp Web`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  
  // Fechar todos os clientes WhatsApp
  for (const [barbershopId, client] of whatsappClients) {
    console.log(`📱 Fechando cliente ${barbershopId}`);
    client.destroy();
  }
  
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});