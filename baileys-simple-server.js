const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

// Importar Baileys
let makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers;
let baileysAvailable = false;

try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default || baileys.makeWASocket;
  DisconnectReason = baileys.DisconnectReason;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  Browsers = baileys.Browsers;
  baileysAvailable = true;
  console.log('✅ Baileys carregado com sucesso');
} catch (error) {
  console.log('❌ Baileys não disponível:', error.message);
}

const QRCode = require('qrcode');

const PORT = process.env.PORT || 3001;

// Storage para WhatsApp
const whatsappSockets = new Map();
const qrCodes = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

// Função para criar conexão WhatsApp
const createWhatsAppConnection = async (instanceName) => {
  if (!baileysAvailable) {
    throw new Error('Baileys não disponível');
  }

  const authDir = path.join(__dirname, 'baileys_auth', instanceName);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    logger: {
      level: 'silent',
      child: () => ({ level: 'silent' })
    }
  });

  return { socket, saveCreds };
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
      service: 'hairfy-baileys-simple',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      baileys: baileysAvailable,
      activeInstances: Array.from(whatsappSockets.keys())
    }));
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

  // Conectar WhatsApp
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    if (!baileysAvailable) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Baileys não disponível'
      }));
      return;
    }

    if (whatsappSockets.has(barbershopId)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'WhatsApp já conectado'
      }));
      return;
    }

    try {
      console.log(`🚀 Conectando WhatsApp Baileys para: ${barbershopId}`);

      const { socket, saveCreds } = await createWhatsAppConnection(barbershopId);
      whatsappSockets.set(barbershopId, socket);

      // Event handlers
      socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('📱 QR Code gerado para:', barbershopId);
          qrCodes.set(barbershopId, qr);
          
          // QR Code expira em 45 segundos
          setTimeout(() => {
            if (qrCodes.has(barbershopId)) {
              console.log('⏰ QR Code expirado para:', barbershopId);
              qrCodes.delete(barbershopId);
            }
          }, 45000);
          
          if (io) {
            io.emit('qr', { barbershopId, qr });
          }
        }
        
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`❌ Conexão fechada para ${barbershopId}:`, lastDisconnect?.error);
          
          whatsappSockets.delete(barbershopId);
          qrCodes.delete(barbershopId);
          
          if (io) {
            io.emit('disconnected', { barbershopId, reason: lastDisconnect?.error?.message });
          }
        } else if (connection === 'open') {
          console.log(`✅ WhatsApp conectado para: ${barbershopId}`);
          qrCodes.delete(barbershopId);
          
          if (io) {
            io.emit('ready', { barbershopId });
          }
        }
      });

      socket.ev.on('creds.update', saveCreds);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Conectando WhatsApp...'
      }));

    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
    return;
  }

  // Status do WhatsApp
  if (pathname.startsWith('/api/whatsapp/status/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const socket = whatsappSockets.get(barbershopId);
    const hasQR = qrCodes.has(barbershopId);

    let status = 'disconnected';
    let connected = false;

    if (socket) {
      if (hasQR) {
        status = 'connecting';
      } else {
        status = 'connected';
        connected = true;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected,
      hasQR,
      status,
      instanceName: barbershopId
    }));
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const socket = whatsappSockets.get(barbershopId);
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
    } else if (socket) {
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'QR Code ainda não disponível, aguarde...',
        status: 'connecting'
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'QR Code não encontrado. Conecte o WhatsApp primeiro.',
        needsConnection: true
      }));
    }
    return;
  }

  // Enviar mensagem
  if (pathname.startsWith('/api/whatsapp/send/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const socket = whatsappSockets.get(barbershopId);
    
    if (!socket) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'WhatsApp não conectado'
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        
        console.log(`📤 Enviando mensagem para ${phone}: ${message}`);
        
        // Formatar número
        const formattedPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
        
        const result = await socket.sendMessage(formattedPhone, { text: message });
        console.log('✅ Mensagem enviada:', result.key.id);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Mensagem enviada',
          messageId: result.key.id
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

  // Desconectar WhatsApp
  if (pathname.startsWith('/api/whatsapp/disconnect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const socket = whatsappSockets.get(barbershopId);
    
    console.log(`🔌 Desconectando WhatsApp para: ${barbershopId}`);

    if (socket) {
      try {
        await socket.logout();
        socket.end();
      } catch (error) {
        console.log('Erro ao desconectar:', error.message);
      }
    }

    // Limpar tudo
    whatsappSockets.delete(barbershopId);
    qrCodes.delete(barbershopId);

    // Limpar arquivos de auth
    const authDir = path.join(__dirname, 'baileys_auth', barbershopId);
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log(`🗑️ Auth limpo para: ${barbershopId}`);
      } catch (error) {
        console.log('Erro ao limpar auth:', error.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'WhatsApp desconectado e sessão limpa'
    }));
    return;
  }

  // Reset WhatsApp
  if (pathname.startsWith('/api/whatsapp/reset/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const socket = whatsappSockets.get(barbershopId);
    
    if (socket) {
      try {
        socket.end();
      } catch (error) {
        console.log('Erro ao fechar socket:', error);
      }
    }
    
    whatsappSockets.delete(barbershopId);
    qrCodes.delete(barbershopId);
    
    // Limpar arquivos de auth
    const authDir = path.join(__dirname, 'baileys_auth', barbershopId);
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (error) {
        console.log('Erro ao limpar auth:', error);
      }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      message: 'Reset completo realizado'
    }));
    return;
  }

  // 404
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
  console.log(`🚀 Servidor Baileys Simples rodando na porta ${PORT}`);
  console.log(`📱 Baileys: ${baileysAvailable ? '✅ Disponível' : '❌ Não disponível'}`);
  console.log(`🎯 WhatsApp integrado diretamente no servidor!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  
  for (const [barbershopId, socket] of whatsappSockets) {
    console.log(`📱 Fechando socket ${barbershopId}`);
    try {
      socket.end();
    } catch (error) {
      console.log('Erro ao fechar socket:', error);
    }
  }
  
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});