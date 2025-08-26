const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Configuração Evolution API Externa
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Storage para controle local
const instanceStatus = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

// Função para fazer requisições ao Evolution API
const callEvolutionAPI = async (endpoint, method = 'GET', data = null) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API URL ou KEY não configuradas');
  }

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

  console.log(`🔗 Evolution API: ${method} ${endpoint}`);

  try {
    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro Evolution API:', error.message);
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
      service: 'hairfy-external-evolution',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      evolutionAPI: {
        configured: !!(EVOLUTION_API_URL && EVOLUTION_API_KEY),
        url: EVOLUTION_API_URL ? 'Configurada' : 'Não configurada',
        key: EVOLUTION_API_KEY ? 'Configurada' : 'Não configurada'
      },
      activeInstances: Array.from(instanceStatus.keys())
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

  // Conectar WhatsApp via Evolution API Externa
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      console.log(`🚀 Conectando via Evolution API externa: ${barbershopId}`);

      // Criar instância no Evolution API
      const instanceData = {
        instanceName: barbershopId,
        token: barbershopId,
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS'
      };

      const result = await callEvolutionAPI('/instance/create', 'POST', instanceData);
      
      instanceStatus.set(barbershopId, {
        status: 'connecting',
        createdAt: new Date().toISOString()
      });

      console.log('✅ Instância criada no Evolution API:', result);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Conectando via Evolution API externa...',
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao conectar Evolution API:', error);
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
    
    try {
      const result = await callEvolutionAPI(`/instance/connectionState/${barbershopId}`);
      
      const connected = result.instance?.state === 'open';
      const status = result.instance?.state || 'disconnected';
      
      instanceStatus.set(barbershopId, {
        status,
        connected,
        lastCheck: new Date().toISOString()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected,
        status,
        hasQR: status === 'connecting',
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        status: 'error',
        error: error.message,
        hasQR: false
      }));
    }
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      const result = await callEvolutionAPI(`/instance/connect/${barbershopId}`);
      
      if (result.base64) {
        const qrImage = `data:image/png;base64,${result.base64}`;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ qr: qrImage }));
      } else if (result.instance?.state === 'open') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'WhatsApp já está conectado',
          connected: true
        }));
      } else {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'QR Code ainda não disponível, aguarde...',
          status: 'connecting'
        }));
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

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        
        console.log(`📤 Enviando mensagem via Evolution API para ${phone}: ${message}`);
        
        // Formatar número
        const formattedPhone = phone.replace(/\D/g, '');
        
        const messageData = {
          number: formattedPhone,
          text: message
        };

        const result = await callEvolutionAPI(`/message/sendText/${barbershopId}`, 'POST', messageData);
        
        console.log('✅ Mensagem enviada via Evolution API:', result);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Mensagem enviada via Evolution API externa',
          messageId: result.key?.id
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
    
    try {
      await callEvolutionAPI(`/instance/logout/${barbershopId}`, 'DELETE');
      
      instanceStatus.delete(barbershopId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Desconectado via Evolution API externa' 
      }));

    } catch (error) {
      console.error('❌ Erro ao desconectar:', error);
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
    
    try {
      // Deletar instância completamente
      await callEvolutionAPI(`/instance/delete/${barbershopId}`, 'DELETE');
      
      instanceStatus.delete(barbershopId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Reset completo via Evolution API externa' 
      }));

    } catch (error) {
      console.error('❌ Erro ao resetar:', error);
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
  console.log(`🚀 Servidor Evolution API Externa rodando na porta ${PORT}`);
  console.log(`🔗 Evolution API URL: ${EVOLUTION_API_URL || 'NÃO CONFIGURADA'}`);
  console.log(`🔑 Evolution API Key: ${EVOLUTION_API_KEY ? '✅ Configurada (segura)' : '❌ Não configurada'}`);
  console.log(`📱 Pronto para WhatsApp via API externa!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});