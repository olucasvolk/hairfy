const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Configuração do Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Storage para instâncias WhatsApp
const whatsappInstances = new Map();
const qrCodes = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

// Função para fazer requisições ao Evolution API
const evolutionRequest = async (endpoint, method = 'GET', data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na requisição Evolution API:', error);
    throw error;
  }
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
      service: 'hairfy-evolution-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      whatsapp: whatsappInstances.size > 0 ? 'active' : 'inactive',
      evolutionApi: EVOLUTION_API_URL,
      hasApiKey: !!EVOLUTION_API_KEY
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

  // Página inicial (se não houver build do React)
  if (pathname === '/' && !hasReactBuild) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hairfy - Evolution API WhatsApp</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .info { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #007acc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>💈 Hairfy - Evolution API WhatsApp</h1>
        
        <div class="info">
          <h3>✅ Evolution API Integrado</h3>
          <p>Sistema usando Evolution API para WhatsApp - sem dependências de navegador!</p>
          <ul>
            <li><strong>API URL:</strong> ${EVOLUTION_API_URL}</li>
            <li><strong>API Key:</strong> ${EVOLUTION_API_KEY ? '✅ Configurada' : '❌ Não configurada'}</li>
            <li><strong>Instâncias ativas:</strong> ${whatsappInstances.size}</li>
          </ul>
        </div>
        
        ${!EVOLUTION_API_KEY ? `
        <div class="warning">
          <h3>⚠️ Configuração necessária</h3>
          <p>Para usar o WhatsApp, configure as variáveis de ambiente:</p>
          <ul>
            <li><code>EVOLUTION_API_URL</code> - URL da sua instância Evolution API</li>
            <li><code>EVOLUTION_API_KEY</code> - Chave de API do Evolution</li>
          </ul>
        </div>
        ` : ''}
        
        <h2>🚀 APIs Disponíveis:</h2>
        
        <div class="endpoint">
          <span class="method">POST</span> /api/whatsapp/connect/{barbershopId} - Conectar WhatsApp
        </div>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/whatsapp/status/{barbershopId} - Status da conexão
        </div>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/whatsapp/qr/{barbershopId} - Obter QR Code
        </div>
        
        <div class="endpoint">
          <span class="method">POST</span> /api/whatsapp/send/{barbershopId} - Enviar mensagem
        </div>
        
        <div class="endpoint">
          <span class="method">POST</span> /api/whatsapp/disconnect/{barbershopId} - Desconectar
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Conectar WhatsApp via Evolution API
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    try {
      console.log(`🚀 Conectando WhatsApp Evolution para: ${barbershopId}`);

      // Criar instância no Evolution API
      const instanceData = {
        instanceName: barbershopId,
        token: barbershopId,
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS'
      };

      const result = await evolutionRequest('/instance/create', 'POST', instanceData);
      
      whatsappInstances.set(barbershopId, {
        instanceName: barbershopId,
        status: 'connecting',
        createdAt: new Date()
      });

      console.log('✅ Instância Evolution criada:', result);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Conectando via Evolution API...',
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao conectar Evolution:', error);
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
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        connected: false,
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    try {
      const result = await evolutionRequest(`/instance/connectionState/${barbershopId}`);
      
      const connected = result.instance?.state === 'open';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected,
        status: result.instance?.state || 'disconnected',
        hasQR: qrCodes.has(barbershopId),
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        status: 'error',
        error: error.message
      }));
    }
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    try {
      const result = await evolutionRequest(`/instance/connect/${barbershopId}`);
      
      if (result.base64) {
        const qrImage = `data:image/png;base64,${result.base64}`;
        qrCodes.set(barbershopId, qrImage);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ qr: qrImage }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'QR Code não disponível' }));
      }

    } catch (error) {
      console.error('❌ Erro ao obter QR Code:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Enviar mensagem
  if (pathname.startsWith('/api/whatsapp/send/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        
        console.log(`📤 Enviando mensagem Evolution para ${phone}: ${message}`);
        
        // Formatar número
        const formattedPhone = phone.replace(/\D/g, '');
        
        const messageData = {
          number: formattedPhone,
          text: message
        };

        const result = await evolutionRequest(`/message/sendText/${barbershopId}`, 'POST', messageData);
        
        console.log('✅ Mensagem enviada via Evolution:', result);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Mensagem enviada via Evolution API',
          messageId: result.key?.id
        }));

      } catch (error) {
        console.error('❌ Erro ao enviar mensagem Evolution:', error);
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
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    try {
      await evolutionRequest(`/instance/logout/${barbershopId}`, 'DELETE');
      
      whatsappInstances.delete(barbershopId);
      qrCodes.delete(barbershopId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Desconectado via Evolution API' 
      }));

    } catch (error) {
      console.error('❌ Erro ao desconectar Evolution:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
    return;
  }

  // Reset WhatsApp
  if (pathname.startsWith('/api/whatsapp/reset/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    if (!EVOLUTION_API_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: 'Evolution API Key não configurada' 
      }));
      return;
    }

    try {
      // Deletar instância completamente
      await evolutionRequest(`/instance/delete/${barbershopId}`, 'DELETE');
      
      whatsappInstances.delete(barbershopId);
      qrCodes.delete(barbershopId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Reset completo via Evolution API' 
      }));

    } catch (error) {
      console.error('❌ Erro ao resetar Evolution:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
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
  console.log(`🚀 Servidor Evolution API rodando na porta ${PORT}`);
  console.log(`🔗 Evolution API URL: ${EVOLUTION_API_URL}`);
  console.log(`🔑 API Key: ${EVOLUTION_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`📱 Pronto para WhatsApp sem Chromium!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor Evolution...');
  
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});