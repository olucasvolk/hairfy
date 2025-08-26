const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

// Importar Evolution API integrado
let makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers;
let evolutionAvailable = false;

try {
    const baileys = require('@whiskeysockets/baileys');
    makeWASocket = baileys.default || baileys.makeWASocket;
    DisconnectReason = baileys.DisconnectReason;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    Browsers = baileys.Browsers;
    evolutionAvailable = true;
    console.log('✅ Evolution API integrado carregado com sucesso');
    console.log('📦 Baileys version:', require('@whiskeysockets/baileys/package.json').version);
} catch (error) {
    console.log('❌ Baileys não disponível:', error.message);
    console.log('🔄 Servidor funcionará sem WhatsApp até dependências serem instaladas');
}

const QRCode = require('qrcode');

const PORT = process.env.PORT || 3001;

// Storage para instâncias WhatsApp (Evolution API integrado)
const whatsappSockets = new Map();
const qrCodes = new Map();
const authStates = new Map();

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

// Função para criar conexão WhatsApp (Evolution API integrado)
const createWhatsAppConnection = async (instanceName) => {
    if (!evolutionAvailable) {
        throw new Error('Evolution API não disponível - instale @whiskeysockets/baileys');
    }

    const authDir = path.join(__dirname, 'evolution_auth', instanceName);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    authStates.set(instanceName, { state, saveCreds });

    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        logger: {
            level: 'silent',
            child: () => ({ level: 'silent' })
        },
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    return socket;
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
            service: 'hairfy-integrated-evolution',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            whatsapp: whatsappSockets.size > 0 ? 'active' : 'inactive',
            evolutionIntegrated: evolutionAvailable,
            activeInstances: Array.from(whatsappSockets.keys())
        }));
        return;
    }

    // Debug endpoint
    if (pathname === '/debug' || pathname === '/api/debug') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            service: 'hairfy-integrated-evolution',
            evolutionAvailable,
            activeInstances: Array.from(whatsappSockets.keys()),
            qrCodes: Array.from(qrCodes.keys()),
            authStates: Array.from(authStates.keys()),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            },
            baileys: evolutionAvailable ? {
                version: require('@whiskeysockets/baileys/package.json').version
            } : null
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
        <title>Hairfy - Evolution API Integrado</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #007acc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>💈 Hairfy - Evolution API Integrado</h1>
        
        <div class="success">
          <h3>🎉 Evolution API rodando no mesmo servidor!</h3>
          <p><strong>Status:</strong> ${evolutionAvailable ? '✅ Ativo' : '❌ Instalando dependências'}</p>
          <p><strong>Instâncias ativas:</strong> ${whatsappSockets.size}</p>
          <p><strong>Sem custos externos!</strong> Tudo roda aqui no App Platform.</p>
        </div>
        
        <div class="info">
          <h3>📱 Como funciona:</h3>
          <ul>
            <li>Evolution API integrado diretamente no servidor</li>
            <li>Cada barbearia tem sua própria instância WhatsApp</li>
            <li>QR Code gerado internamente</li>
            <li>Mensagens enviadas diretamente</li>
            <li>Sem dependências externas!</li>
          </ul>
        </div>
        
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
        
        <div class="endpoint">
          <span class="method">POST</span> /api/whatsapp/reset/{barbershopId} - Reset completo
        </div>
      </body>
      </html>
    `);
        return;
    }

    // Conectar WhatsApp (Evolution integrado)
    if (pathname.startsWith('/api/whatsapp/connect/') && method === 'POST') {
        const barbershopId = pathname.split('/').pop();

        if (!evolutionAvailable) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Evolution API ainda não disponível',
                message: 'Aguarde a instalação das dependências completar',
                retry: true
            }));
            return;
        }

        if (whatsappSockets.has(barbershopId)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'WhatsApp já conectado',
                instanceName: barbershopId
            }));
            return;
        }

        try {
            console.log(`🚀 Conectando WhatsApp integrado para: ${barbershopId}`);

            const socket = await createWhatsAppConnection(barbershopId);
            whatsappSockets.set(barbershopId, socket);

            // Event handlers
            socket.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('📱 QR Code gerado para:', barbershopId);
                    qrCodes.set(barbershopId, qr);

                    // QR Code expira em 60 segundos
                    setTimeout(() => {
                        if (qrCodes.has(barbershopId)) {
                            console.log('⏰ QR Code expirado para:', barbershopId);
                            qrCodes.delete(barbershopId);
                        }
                    }, 60000);

                    if (io) {
                        io.emit('qr', { barbershopId, qr });
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(`❌ Conexão fechada para ${barbershopId}:`, lastDisconnect?.error, 'Reconectar:', shouldReconnect);

                    whatsappSockets.delete(barbershopId);
                    qrCodes.delete(barbershopId);

                    if (io) {
                        io.emit('disconnected', { barbershopId, reason: lastDisconnect?.error?.message });
                    }

                    // NÃO auto-reconectar - deixar usuário decidir
                } else if (connection === 'open') {
                    console.log(`✅ WhatsApp conectado para: ${barbershopId}`);
                    qrCodes.delete(barbershopId);

                    if (io) {
                        io.emit('ready', { barbershopId });
                    }
                }
            });

            socket.ev.on('creds.update', () => {
                const authState = authStates.get(barbershopId);
                if (authState) {
                    authState.saveCreds();
                }
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Conectando WhatsApp integrado...',
                instanceName: barbershopId
            }));

        } catch (error) {
            console.error('❌ Erro ao conectar WhatsApp integrado:', error);
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            connected: socket ? true : false,
            hasQR: qrCodes.has(barbershopId),
            status: socket ? 'connected' : 'disconnected',
            instanceName: barbershopId,
            evolutionIntegrated: true
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
            // Socket existe mas não há QR Code - provavelmente já conectado
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'WhatsApp já está conectado',
                connected: true
            }));
        } else {
            // Não há socket nem QR Code - precisa conectar primeiro
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
                error: 'WhatsApp não conectado para esta barbearia'
            }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { phone, message } = JSON.parse(body);

                console.log(`📤 Enviando mensagem integrada para ${phone}: ${message}`);

                // Formatar número
                const formattedPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';

                const result = await socket.sendMessage(formattedPhone, { text: message });
                console.log('✅ Mensagem enviada via Evolution integrado:', result.key.id);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Mensagem enviada via Evolution integrado',
                    messageId: result.key.id,
                    instanceName: barbershopId
                }));

            } catch (error) {
                console.error('❌ Erro ao enviar mensagem integrada:', error);
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
                // Fazer logout primeiro para limpar sessão no WhatsApp
                await socket.logout();
                console.log(`📱 Logout realizado para: ${barbershopId}`);
            } catch (error) {
                console.log('Erro no logout:', error.message);
            }

            try {
                // Fechar conexão
                socket.end();
                console.log(`🔌 Socket fechado para: ${barbershopId}`);
            } catch (error) {
                console.log('Erro ao fechar socket:', error.message);
            }
        }

        // Limpar tudo da memória
        whatsappSockets.delete(barbershopId);
        qrCodes.delete(barbershopId);
        authStates.delete(barbershopId);

        // Limpar arquivos de autenticação
        const authDir = path.join(__dirname, 'evolution_auth', barbershopId);
        if (fs.existsSync(authDir)) {
            try {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log(`🗑️ Arquivos de auth removidos para: ${barbershopId}`);
            } catch (error) {
                console.log('Erro ao remover auth:', error.message);
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'WhatsApp desconectado e sessão limpa completamente',
            instanceName: barbershopId,
            cleaned: {
                socket: true,
                qrCode: true,
                authState: true,
                authFiles: fs.existsSync(authDir) ? false : true
            }
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
        authStates.delete(barbershopId);

        // Limpar arquivos de auth
        const authDir = path.join(__dirname, 'evolution_auth', barbershopId);
        if (fs.existsSync(authDir)) {
            try {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log(`🗑️ Auth limpo para: ${barbershopId}`);
            } catch (error) {
                console.log('Erro ao limpar auth:', error);
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Reset completo realizado',
            instanceName: barbershopId
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
    console.log(`🚀 Servidor Evolution API Integrado rodando na porta ${PORT}`);
    console.log(`📱 Evolution API: ${evolutionAvailable ? '✅ Integrado' : '❌ Instalando dependências'}`);
    console.log(`💰 Sem custos externos - tudo no mesmo servidor!`);
    console.log(`🎯 Perfeito para DigitalOcean App Platform`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Encerrando servidor integrado...');

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