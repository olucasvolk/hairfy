const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Storage simples para debug
const connections = new Map();
const qrCodes = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

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
      service: 'hairfy-debug-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      connections: connections.size,
      qrCodes: qrCodes.size
    }));
    return;
  }

  // Debug endpoint
  if (pathname === '/debug' || pathname === '/api/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'hairfy-debug-server',
      connections: Array.from(connections.keys()),
      qrCodes: Array.from(qrCodes.keys()),
      allRequests: 'logged to console',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        port: PORT
      }
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

  // Conectar WhatsApp (SIMULADO para debug)
  if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    console.log(`🚀 [DEBUG] Conectando WhatsApp para: ${barbershopId}`);
    
    // Simular conexão
    connections.set(barbershopId, {
      status: 'connecting',
      connectedAt: new Date().toISOString()
    });

    // Simular QR Code após 2 segundos
    setTimeout(() => {
      const fakeQR = `fake-qr-code-for-${barbershopId}-${Date.now()}`;
      qrCodes.set(barbershopId, fakeQR);
      console.log(`📱 [DEBUG] QR Code gerado para: ${barbershopId}`);
    }, 2000);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      message: '[DEBUG] Conectando WhatsApp simulado...',
      instanceName: barbershopId,
      debug: true
    }));
    return;
  }

  // Status do WhatsApp
  if (pathname.startsWith('/api/whatsapp/status/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const connection = connections.get(barbershopId);
    
    console.log(`📊 [DEBUG] Status solicitado para: ${barbershopId}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: connection ? true : false,
      hasQR: qrCodes.has(barbershopId),
      status: connection ? connection.status : 'disconnected',
      instanceName: barbershopId,
      debug: true
    }));
    return;
  }

  // Obter QR Code
  if (pathname.startsWith('/api/whatsapp/qr/') && method === 'GET') {
    const barbershopId = pathname.split('/').pop();
    const qr = qrCodes.get(barbershopId);
    
    console.log(`📷 [DEBUG] QR Code solicitado para: ${barbershopId}, existe: ${!!qr}`);
    
    if (qr) {
      try {
        // Gerar QR Code fake para debug
        const QRCode = require('qrcode');
        const qrImage = await QRCode.toDataURL(`DEBUG: ${qr}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          qr: qrImage,
          debug: true,
          message: 'QR Code de debug gerado'
        }));
      } catch (error) {
        console.error('❌ [DEBUG] Erro ao gerar QR Code:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Erro ao gerar QR Code de debug',
          debug: true
        }));
      }
    } else {
      const connection = connections.get(barbershopId);
      
      if (connection) {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'QR Code ainda não disponível, aguarde...',
          status: connection.status,
          debug: true,
          message: 'Conecte primeiro, QR Code será gerado em alguns segundos'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'QR Code não encontrado. Conecte o WhatsApp primeiro.',
          needsConnection: true,
          debug: true,
          availableConnections: Array.from(connections.keys())
        }));
      }
    }
    return;
  }

  // Enviar mensagem (SIMULADO)
  if (pathname.startsWith('/api/whatsapp/send/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    const connection = connections.get(barbershopId);
    
    if (!connection) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'WhatsApp não conectado para esta barbearia',
        debug: true
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        
        console.log(`📤 [DEBUG] Simulando envio para ${phone}: ${message}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: '[DEBUG] Mensagem simulada enviada',
          messageId: `debug-${Date.now()}`,
          instanceName: barbershopId,
          debug: true
        }));

      } catch (error) {
        console.error('❌ [DEBUG] Erro ao simular envio:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message,
          debug: true
        }));
      }
    });
    return;
  }

  // Reset WhatsApp
  if (pathname.startsWith('/api/whatsapp/reset/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    console.log(`🔄 [DEBUG] Reset para: ${barbershopId}`);
    
    connections.delete(barbershopId);
    qrCodes.delete(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      message: '[DEBUG] Reset simulado realizado',
      instanceName: barbershopId,
      debug: true
    }));
    return;
  }

  // Desconectar
  if (pathname.startsWith('/api/whatsapp/disconnect/') && method === 'POST') {
    const barbershopId = pathname.split('/').pop();
    
    console.log(`❌ [DEBUG] Desconectando: ${barbershopId}`);
    
    connections.delete(barbershopId);
    qrCodes.delete(barbershopId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      message: '[DEBUG] Desconexão simulada',
      instanceName: barbershopId,
      debug: true
    }));
    return;
  }

  // 404 para outras rotas
  console.log(`❌ [DEBUG] Rota não encontrada: ${method} ${pathname}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Rota não encontrada',
    method,
    pathname,
    debug: true,
    availableRoutes: [
      'POST /api/whatsapp/connect/{id}',
      'GET /api/whatsapp/status/{id}',
      'GET /api/whatsapp/qr/{id}',
      'POST /api/whatsapp/send/{id}',
      'GET /debug'
    ]
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 [DEBUG] Servidor de debug rodando na porta ${PORT}`);
  console.log(`🔧 [DEBUG] Todas as requisições serão logadas`);
  console.log(`📱 [DEBUG] WhatsApp simulado - sem dependências reais`);
  console.log(`🌐 [DEBUG] Acesse /debug para ver informações`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [DEBUG] Encerrando servidor de debug...');
  server.close(() => {
    console.log('✅ [DEBUG] Servidor encerrado');
    process.exit(0);
  });
});