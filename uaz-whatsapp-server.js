const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Configuração UAZ API
const UAZ_API_URL = 'https://hairfycombr.uazapi.com';
const UAZ_TOKEN = 'clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig';

// Storage para controle de instâncias
const instanceStatus = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

console.log(`🚀 Iniciando servidor UAZ API WhatsApp`);
console.log(`🔗 UAZ API URL: ${UAZ_API_URL}`);
console.log(`🔑 Token configurado: ${UAZ_TOKEN ? '✅ Sim' : '❌ Não'}`);
console.log(`📦 Build React: ${hasReactBuild ? '✅ Encontrado' : '❌ Não encontrado'}`);

// Função para fazer requisições à UAZ API
const callUazAPI = async (endpoint, method = 'GET', data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${UAZ_TOKEN}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const fullUrl = `${UAZ_API_URL}${endpoint}`;
  console.log(`🔗 UAZ API: ${method} ${fullUrl}`);
  
  if (data) {
    console.log(`📤 Dados enviados:`, JSON.stringify(data, null, 2));
  }

  try {
    const response = await fetch(fullUrl, options);
    const result = await response.json();
    
    console.log(`📥 Resposta UAZ (${response.status}):`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(result.message || result.error || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro UAZ API:', error.message);
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
      service: 'hairfy-uaz-whatsapp',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uazAPI: {
        url: UAZ_API_URL,
        configured: !!UAZ_TOKEN,
        token: UAZ_TOKEN ? `${UAZ_TOKEN.substring(0, 10)}...` : 'não configurado'
      },
      activeInstances: Array.from(instanceStatus.keys()),
      reactBuild: hasReactBuild
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
      else if (ext === '.ico') contentType = 'image/x-icon';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (error) {
      console.error('❌ Erro ao servir arquivo:', error);
    }
  }

  // Conectar WhatsApp via UAZ API
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      console.log(`🚀 Conectando WhatsApp via UAZ API: ${barbershopId}`);

      // Primeiro verificar se já está conectado
      const statusResult = await callUazAPI('/instance/status');
      
      if (statusResult.status === 'connected' || statusResult.status === 'open') {
        console.log('✅ WhatsApp já conectado!');
        
        instanceStatus.set(barbershopId, {
          status: 'connected',
          connected: true,
          createdAt: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'WhatsApp já está conectado!',
          instanceName: barbershopId,
          status: 'connected',
          connected: true
        }));
        return;
      }

      // Se não conectado, iniciar processo de conexão
      const connectResult = await callUazAPI('/instance/connect', 'POST');
      
      instanceStatus.set(barbershopId, {
        status: connectResult.status || 'connecting',
        connected: false,
        createdAt: new Date().toISOString()
      });

      console.log('✅ Processo de conexão iniciado:', connectResult);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Conectando WhatsApp via UAZ API...',
        instanceName: barbershopId,
        status: connectResult.status || 'connecting',
        connected: false
      }));

    } catch (error) {
      console.error('❌ Erro ao conectar UAZ API:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro ao conectar com UAZ API'
      }));
    }
    return;
  }

  // Status do WhatsApp
  if (pathname.startsWith('/api/whatsapp/status/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      const result = await callUazAPI('/instance/status');
      
      const connected = result.status === 'connected' || result.status === 'open';
      const status = result.status || 'disconnected';
      
      instanceStatus.set(barbershopId, {
        status,
        connected,
        lastCheck: new Date().toISOString(),
        phoneNumber: result.phoneNumber || null
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected,
        status,
        hasQR: status === 'qr' || status === 'connecting',
        instanceName: barbershopId,
        phoneNumber: result.phoneNumber || null,
        lastCheck: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Erro ao verificar status UAZ:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        status: 'error',
        error: error.message,
        hasQR: false,
        instanceName: barbershopId
      }));
    }
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      console.log(`📱 Obtendo QR Code para: ${barbershopId}`);
      
      const result = await callUazAPI('/instance/qr');
      
      if (result.qr || result.qrcode || result.base64) {
        const qrData = result.qr || result.qrcode || result.base64;
        
        // Se já é base64 com data URI, usar diretamente
        let qrImage;
        if (qrData.startsWith('data:')) {
          qrImage = qrData;
        } else {
          // Se é só base64, adicionar o data URI
          qrImage = `data:image/png;base64,${qrData}`;
        }
        
        console.log('✅ QR Code obtido com sucesso');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          qr: qrImage,
          status: 'qr_ready'
        }));
        
      } else if (result.status === 'connected' || result.status === 'open') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'WhatsApp já está conectado',
          connected: true,
          status: 'connected'
        }));
        
      } else {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'QR Code ainda não disponível, aguarde...',
          status: result.status || 'connecting'
        }));
      }

    } catch (error) {
      console.error('❌ Erro ao obter QR Code UAZ:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: error.message,
        status: 'error'
      }));
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
        
        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Telefone e mensagem são obrigatórios'
          }));
          return;
        }
        
        console.log(`📤 Enviando mensagem via UAZ API para ${phone}: ${message}`);
        
        // Formatar número (remover caracteres especiais)
        const formattedPhone = phone.replace(/\D/g, '');
        
        // Garantir que tem código do país (Brasil = 55)
        let finalPhone = formattedPhone;
        if (!finalPhone.startsWith('55') && finalPhone.length === 11) {
          finalPhone = '55' + finalPhone;
        }
        
        const messageData = {
          phone: finalPhone,
          message: message,
          isGroup: false
        };

        const result = await callUazAPI('/message/text', 'POST', messageData);
        
        console.log('✅ Mensagem enviada via UAZ API:', result);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Mensagem enviada com sucesso!',
          messageId: result.id || result.messageId || result.key,
          phone: finalPhone,
          sentAt: new Date().toISOString()
        }));

      } catch (error) {
        console.error('❌ Erro ao enviar mensagem UAZ:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message,
          details: 'Erro ao enviar mensagem via UAZ API'
        }));
      }
    });
    return;
  }

  // Desconectar WhatsApp
  if (pathname.startsWith('/api/whatsapp/disconnect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      console.log(`🔌 Desconectando WhatsApp: ${barbershopId}`);
      
      const result = await callUazAPI('/instance/logout', 'POST');
      
      instanceStatus.delete(barbershopId);
      
      console.log('✅ WhatsApp desconectado:', result);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'WhatsApp desconectado com sucesso!',
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao desconectar UAZ:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro ao desconectar WhatsApp'
      }));
    }
    return;
  }

  // Reset WhatsApp
  if (pathname.startsWith('/api/whatsapp/reset/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    try {
      console.log(`🔄 Resetando WhatsApp: ${barbershopId}`);
      
      // Tentar desconectar primeiro
      try {
        await callUazAPI('/instance/logout', 'POST');
      } catch (logoutError) {
        console.log('⚠️ Erro ao fazer logout (pode já estar desconectado):', logoutError.message);
      }
      
      // Limpar dados locais
      instanceStatus.delete(barbershopId);
      
      console.log('✅ Reset completo realizado');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'WhatsApp resetado com sucesso!',
        instanceName: barbershopId
      }));

    } catch (error) {
      console.error('❌ Erro ao resetar UAZ:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Erro ao resetar WhatsApp'
      }));
    }
    return;
  }

  // Listar instâncias ativas (para debug)
  if (pathname === '/api/whatsapp/instances' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      instances: Array.from(instanceStatus.entries()).map(([id, data]) => ({
        id,
        ...data
      })),
      total: instanceStatus.size
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Rota não encontrada',
    path: pathname,
    method: method
  }));
});

// Socket.IO apenas para compatibilidade (não usado pela UAZ API)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado (compatibilidade):', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor UAZ WhatsApp rodando na porta ${PORT}`);
  console.log(`🔗 UAZ API URL: ${UAZ_API_URL}`);
  console.log(`🔑 Token: ${UAZ_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`📱 Pronto para integração WhatsApp!`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor UAZ WhatsApp...');
  
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Interrompido pelo usuário...');
  
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});