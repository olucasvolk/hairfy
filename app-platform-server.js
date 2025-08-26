const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

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

  // Servir arquivos estáticos do React (se existir build)
  if (hasReactBuild && !pathname.startsWith('/api/')) {
    let filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);
    
    // Se arquivo não existe, servir index.html (SPA routing)
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
        <title>Hairfy - Sistema de Barbearia</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #007acc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>💈 Hairfy - Sistema de Barbearia</h1>
        
        <div class="warning">
          <h3>⚠️ Frontend não encontrado</h3>
          <p>O sistema React não foi buildado. Para ver a interface da barbearia, você precisa:</p>
          <ol>
            <li>Executar <code>npm run build</code> localmente</li>
            <li>Fazer commit e push do diretório <code>dist/</code></li>
            <li>Ou configurar o App Platform para fazer build automático</li>
          </ol>
        </div>
        
        <h2>🚀 Servidor WhatsApp funcionando!</h2>
        <p>As APIs do WhatsApp estão disponíveis:</p>
        
        <div class="endpoint">
          <span class="method">GET</span> /health - Status do servidor
        </div>
        
        <div class="endpoint">
          <span class="method">POST</span> /api/whatsapp/init - Inicializar WhatsApp
        </div>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/whatsapp/qr - Obter QR Code
        </div>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/whatsapp/status - Status da conexão
        </div>
      </body>
      </html>
    `);
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

  // Status do WhatsApp (com barbershopId na URL)
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

  // Status do WhatsApp (com query parameter)
  if (pathname === '/api/whatsapp/status' && method === 'GET') {
    const barbershopId = parsedUrl.query.barbershopId;
    const client = whatsappClients.get(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: client ? true : false,
      hasQR: qrCodes.has(barbershopId),
      status: client ? 'connected' : 'disconnected'
    }));
    return;
  }

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
      res.end(JSON.stringify({ success: true, message: 'Connecting...' }));

    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Desconectar WhatsApp
  if (pathname.startsWith('/api/whatsapp/disconnect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const client = whatsappClients.get(barbershopId);
    
    if (client) {
      try {
        await client.destroy();
        whatsappClients.delete(barbershopId);
        qrCodes.delete(barbershopId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Disconnected' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Already disconnected' }));
    }
    return;
  }

  // Reset WhatsApp
  if (pathname.startsWith('/api/whatsapp/reset/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const client = whatsappClients.get(barbershopId);
    
    if (client) {
      try {
        await client.destroy();
      } catch (error) {
        console.log('Erro ao destruir cliente:', error);
      }
    }
    
    whatsappClients.delete(barbershopId);
    qrCodes.delete(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Reset completed' }));
    return;
  }

  // Obter QR Code (com barbershopId na URL)
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
        
        // Formatar número de telefone
        const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
        
        await client.sendMessage(formattedPhone, message);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Mensagem enviada' }));
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
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