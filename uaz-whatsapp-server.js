const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Configuração UAZ API
const UAZ_API_URL = 'https://hairfycombr.uazapi.com';
const UAZ_ADMIN_TOKEN = 'clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig';

// Storage para controle de instâncias (token de cada instância)
const instanceTokens = new Map(); // barbershopId -> instanceToken
const instanceStatus = new Map();  // barbershopId -> status

// Função para salvar token da instância no Supabase
const saveInstanceToken = async (barbershopId, instanceToken, instanceId = null) => {
    try {
        console.log(`💾 Salvando token da instância no Supabase: ${barbershopId}`);
        
        const updateData = {
            barbershop_id: barbershopId,
            instance_token: instanceToken,
            status: 'connecting',
            is_connected: false,
            last_connected_at: new Date().toISOString()
        };
        
        if (instanceId) {
            updateData.instance_id = instanceId;
        }
        
        // Usar fetch para chamar Supabase REST API
        const supabaseUrl = 'https://eubmuubokczxlustnpyx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Ym11dWJva2N6eGx1c3RucHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NzI4MSwiZXhwIjoyMDUwNTUzMjgxfQ.FJjhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhq'; // Service role key
        
        const response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Erro ao salvar no Supabase:', error);
        } else {
            console.log('✅ Token da instância salvo no Supabase');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar token da instância:', error);
    }
};

// Função para recuperar token da instância do Supabase
const getInstanceToken = async (barbershopId) => {
    try {
        console.log(`🔍 Buscando token da instância no Supabase: ${barbershopId}`);
        
        const supabaseUrl = 'https://eubmuubokczxlustnpyx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Ym11dWJva2N6eGx1c3RucHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NzI4MSwiZXhwIjoyMDUwNTUzMjgxfQ.FJjhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhq';
        
        const response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_sessions?barbershop_id=eq.${barbershopId}&select=instance_token,instance_id`, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0 && data[0].instance_token) {
                console.log(`✅ Token encontrado no Supabase: ${data[0].instance_token.substring(0, 10)}...`);
                return data[0].instance_token;
            }
        }
        
        console.log('ℹ️ Nenhum token encontrado no Supabase');
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao buscar token da instância:', error);
        return null;
    }
};

// Função para limpar token da instância do Supabase
const clearInstanceFromSupabase = async (barbershopId) => {
    try {
        console.log(`🗑️ Limpando token da instância do Supabase: ${barbershopId}`);
        
        const supabaseUrl = 'https://eubmuubokczxlustnpyx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Ym11dWJva2N6eGx1c3RucHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NzI4MSwiZXhwIjoyMDUwNTUzMjgxfQ.FJjhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhqhJhOhEhq';
        
        const response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_sessions?barbershop_id=eq.${barbershopId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            },
            body: JSON.stringify({
                instance_token: null,
                instance_id: null,
                status: 'disconnected',
                is_connected: false,
                last_connected_at: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('✅ Token da instância limpo do Supabase');
        } else {
            const error = await response.text();
            console.error('❌ Erro ao limpar do Supabase:', error);
        }
        
    } catch (error) {
        console.error('❌ Erro ao limpar token da instância:', error);
    }
};

// Verificar se existe build do React
const distPath = path.join(__dirname, 'dist');
const hasReactBuild = fs.existsSync(distPath);

console.log(`🚀 Iniciando servidor UAZ API WhatsApp`);
console.log(`🔗 UAZ API URL: ${UAZ_API_URL}`);
console.log(`🔑 Admin Token: ${UAZ_ADMIN_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`📦 Build React: ${hasReactBuild ? '✅ Encontrado' : '❌ Não encontrado'}`);

// Função para fazer requisições à UAZ API
const callUazAPI = async (endpoint, method = 'GET', data = null, useAdminToken = false, instanceToken = null) => {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    // Escolher o token correto
    if (useAdminToken) {
        headers['admintoken'] = UAZ_ADMIN_TOKEN;
        console.log(`🔑 Usando admintoken: ${UAZ_ADMIN_TOKEN.substring(0, 10)}...`);
    } else if (instanceToken) {
        headers['token'] = instanceToken;
        console.log(`🔑 Usando token da instância: ${instanceToken.substring(0, 10)}...`);
    } else {
        console.log('⚠️ NENHUM TOKEN FORNECIDO!');
        console.log(`useAdminToken: ${useAdminToken}, instanceToken: ${instanceToken}`);
    }

    const options = {
        method,
        headers
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const fullUrl = `${UAZ_API_URL}${endpoint}`;
    console.log(`🔗 UAZ API: ${method} ${fullUrl}`);
    console.log(`🔑 Header: ${useAdminToken ? 'admintoken' : 'token'}: ${useAdminToken ? UAZ_ADMIN_TOKEN.substring(0, 10) : instanceToken?.substring(0, 10)}...`);
    
    if (data) {
        console.log(`📤 Dados:`, JSON.stringify(data, null, 2));
    }

    try {
        const response = await fetch(fullUrl, options);
        const result = await response.json();
        
        console.log(`📥 Resposta UAZ (${response.status}):`, JSON.stringify(result, null, 2));
        
        if (!response.ok) {
            throw new Error(result.message || result.error || result.response || `HTTP ${response.status}`);
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
                adminTokenConfigured: !!UAZ_ADMIN_TOKEN,
                activeInstances: Array.from(instanceTokens.keys())
            },
            reactBuild: hasReactBuild
        }));
        return;
    }

    // Teste de conectividade UAZ API
    if (pathname === '/api/test-uaz' && method === 'GET') {
        try {
            console.log('🧪 Testando conectividade UAZ API...');
            
            // Testar criação de instância de teste
            const testInstanceData = {
                name: `test-${Date.now()}`,
                systemName: 'hairfy-test'
            };
            
            const result = await callUazAPI('/instance/init', 'POST', testInstanceData, true);
            
            // Se chegou aqui, funcionou!
            console.log('✅ UAZ API funcionando! Instância de teste criada.');
            
            // Deletar a instância de teste
            if (result.token) {
                try {
                    await callUazAPI('/instance', 'DELETE', null, false, result.token);
                    console.log('🗑️ Instância de teste deletada.');
                } catch (deleteError) {
                    console.log('⚠️ Erro ao deletar instância de teste:', deleteError.message);
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'UAZ API funcionando perfeitamente!',
                testResult: result
            }));
            
        } catch (error) {
            console.error('❌ Erro no teste UAZ API:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                message: 'Erro ao testar UAZ API'
            }));
        }
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
        
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                console.log(`🚀 Conectando WhatsApp via UAZ API: ${barbershopId}`);

                // Verificar se foi enviado o número do telefone
                let phoneNumber = null;
                
                if (body) {
                    const requestData = JSON.parse(body);
                    phoneNumber = requestData.phone;
                }
                
                if (!phoneNumber) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Número do telefone é obrigatório',
                        needsPhone: true,
                        message: 'Por favor, informe o número do seu WhatsApp com DDD'
                    }));
                    return;
                }

                // Verificar se já existe instância para esta barbearia
                let instanceToken = instanceTokens.get(barbershopId);
                
                // Se não tem em memória, buscar no Supabase
                if (!instanceToken) {
                    instanceToken = await getInstanceToken(barbershopId);
                    if (instanceToken) {
                        instanceTokens.set(barbershopId, instanceToken);
                        console.log(`✅ Token recuperado do Supabase: ${instanceToken.substring(0, 10)}...`);
                    }
                }
                
                if (!instanceToken) {
                    // Criar nova instância
                    console.log('📝 Criando nova instância UAZ...');
                    
                    const instanceData = {
                        name: `hairfy-${barbershopId}`,
                        systemName: 'hairfy',
                        adminField01: barbershopId,
                        adminField02: 'whatsapp-integration'
                    };
                    
                    const createResult = await callUazAPI('/instance/init', 'POST', instanceData, true);
                    
                    if (createResult.token) {
                        instanceToken = createResult.token;
                        instanceTokens.set(barbershopId, instanceToken);
                        
                        // Salvar no Supabase
                        await saveInstanceToken(barbershopId, instanceToken, createResult.instance?.id);
                        
                        console.log(`✅ Instância criada! Token: ${instanceToken.substring(0, 10)}...`);
                    } else {
                        throw new Error('Falha ao criar instância - token não retornado');
                    }
                }

                // Formatar número (garantir que tenha código do país)
                const formattedPhone = phoneNumber.replace(/\D/g, '');
                let finalPhone = formattedPhone;
                if (!finalPhone.startsWith('55') && finalPhone.length === 11) {
                    finalPhone = '55' + finalPhone;
                }
                
                console.log(`📱 Conectando com número: ${finalPhone}`);

                // Conectar a instância com o número do telefone
                const connectResult = await callUazAPI('/instance/connect', 'POST', {
                    phone: finalPhone
                }, false, instanceToken);
                
                console.log('📱 Resposta completa da UAZ API:', JSON.stringify(connectResult, null, 2));
                
                // Fazer uma verificação adicional do status real da instância
                let statusCheck = null;
                try {
                    console.log('🔍 Verificando status real da instância...');
                    statusCheck = await callUazAPI('/instance/status', 'GET', null, false, instanceToken);
                    console.log('📊 Status real da instância:', JSON.stringify(statusCheck, null, 2));
                } catch (statusError) {
                    console.log('⚠️ Erro ao verificar status:', statusError.message);
                }
                
                // Extrair dados da resposta (priorizar statusCheck se disponível)
                const responseToUse = statusCheck || connectResult;
                
                const qrcode = responseToUse.instance?.qrcode || responseToUse.qrcode || 
                              connectResult.instance?.qrcode || connectResult.qrcode || null;
                const paircode = responseToUse.instance?.paircode || responseToUse.paircode || 
                                connectResult.instance?.paircode || connectResult.paircode || null;
                const instanceStatus_uaz = responseToUse.instance?.status || responseToUse.status || 'connecting';
                const loggedIn = responseToUse.loggedIn || connectResult.loggedIn || false;
                
                // Determinar status real - ser mais rigoroso
                let isConnected = false;
                let realStatus = 'connecting';
                
                console.log('🔍 Análise do status:', {
                    hasQR: !!qrcode,
                    hasPairCode: !!paircode,
                    instanceStatus: instanceStatus_uaz,
                    loggedIn: loggedIn,
                    connected: responseToUse.connected
                });
                
                if (qrcode || paircode) {
                    // Tem QR ou Pairing Code = definitivamente aguardando scan
                    isConnected = false;
                    realStatus = 'waiting_scan';
                    console.log('📱 Status: Aguardando scan (tem QR/Pairing Code)');
                } else if (instanceStatus_uaz === 'connected' && loggedIn === true) {
                    // Só considera conectado se status=connected E loggedIn=true
                    isConnected = true;
                    realStatus = 'connected';
                    console.log('✅ Status: Realmente conectado');
                } else {
                    // Qualquer outro caso = ainda conectando
                    isConnected = false;
                    realStatus = 'connecting';
                    console.log('🔄 Status: Ainda conectando');
                }
                
                instanceStatus.set(barbershopId, {
                    status: realStatus,
                    connected: isConnected,
                    instanceToken: instanceToken,
                    phone: finalPhone,
                    qrcode: qrcode,
                    paircode: paircode,
                    createdAt: new Date().toISOString()
                });

                console.log('✅ Processo de conexão iniciado:', {
                    connected: isConnected,
                    status: realStatus,
                    hasQR: !!qrcode,
                    hasPairCode: !!paircode,
                    response: connectResult.response
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: isConnected ? 'WhatsApp já conectado!' : 'Aguardando conexão...',
                    instanceName: barbershopId,
                    status: realStatus,
                    connected: isConnected,
                    phone: finalPhone,
                    qrcode: qrcode,
                    paircode: paircode,
                    response: connectResult.response
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
        });
        return;
    }

    // Status do WhatsApp
    if (pathname.startsWith('/api/whatsapp/status/') && method === 'GET') {
        const barbershopId = pathname.split('/').pop();
        
        try {
            let instanceToken = instanceTokens.get(barbershopId);
            
            // Se não tem em memória, buscar no Supabase
            if (!instanceToken) {
                instanceToken = await getInstanceToken(barbershopId);
                if (instanceToken) {
                    instanceTokens.set(barbershopId, instanceToken);
                }
            }
            
            if (!instanceToken) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    connected: false,
                    status: 'no_instance',
                    hasQR: false,
                    instanceName: barbershopId,
                    message: 'Nenhuma instância criada'
                }));
                return;
            }

            // Verificar status da instância via UAZ API
            const result = await callUazAPI('/instance/status', 'GET', null, false, instanceToken);
            
            console.log('📊 Status completo da UAZ API:', JSON.stringify(result, null, 2));
            
            const connected = result.connected || false;
            const status = connected ? 'connected' : (result.instance?.qrcode || result.qrcode ? 'waiting_scan' : 'disconnected');
            
            instanceStatus.set(barbershopId, {
                status,
                connected,
                lastCheck: new Date().toISOString(),
                phoneNumber: result.phoneNumber || null,
                instanceToken
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                connected,
                status,
                hasQR: !connected && (result.qrcode || result.instance?.qrcode),
                hasPairCode: !connected && (result.paircode || result.instance?.paircode),
                instanceName: barbershopId,
                phoneNumber: result.phoneNumber || result.instance?.profileName || null,
                qrcode: result.qrcode || result.instance?.qrcode || null,
                paircode: result.paircode || result.instance?.paircode || null
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
            let instanceToken = instanceTokens.get(barbershopId);
            
            // Se não tem em memória, buscar no Supabase
            if (!instanceToken) {
                instanceToken = await getInstanceToken(barbershopId);
                if (instanceToken) {
                    instanceTokens.set(barbershopId, instanceToken);
                }
            }
            
            if (!instanceToken) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Instância não encontrada. Conecte primeiro.',
                    status: 'no_instance'
                }));
                return;
            }

            console.log(`📱 Obtendo QR Code para: ${barbershopId} com token: ${instanceToken.substring(0, 10)}...`);
            
            // Tentar diferentes endpoints para QR Code
            let result = null;
            const qrEndpoints = ['/instance/status', '/instance/qr', '/qr'];
            
            for (const endpoint of qrEndpoints) {
                try {
                    console.log(`🔍 Tentando endpoint: ${endpoint}`);
                    result = await callUazAPI(endpoint, 'GET', null, false, instanceToken);
                    
                    if (result && (result.qrcode || result.qr)) {
                        console.log(`✅ QR Code encontrado no endpoint: ${endpoint}`);
                        break;
                    }
                } catch (endpointError) {
                    console.log(`❌ Endpoint ${endpoint} falhou: ${endpointError.message}`);
                }
            }
            
            if (result && (result.qrcode || result.qr)) {
                // QR Code disponível
                const qrData = result.qrcode || result.qr;
                const qrImage = qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`;
                
                console.log('✅ QR Code obtido com sucesso');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    qr: qrImage,
                    status: 'qr_ready'
                }));
                
            } else if (result && result.connected) {
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
                    status: 'connecting',
                    debug: result
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

                let instanceToken = instanceTokens.get(barbershopId);
                
                // Se não tem em memória, buscar no Supabase
                if (!instanceToken) {
                    instanceToken = await getInstanceToken(barbershopId);
                    if (instanceToken) {
                        instanceTokens.set(barbershopId, instanceToken);
                    }
                }
                
                if (!instanceToken) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Instância não encontrada. Conecte primeiro.'
                    }));
                    return;
                }
                
                console.log(`📤 Enviando mensagem via UAZ API para ${phone}: ${message}`);
                
                // Formatar número
                const formattedPhone = phone.replace(/\D/g, '');
                let finalPhone = formattedPhone;
                if (!finalPhone.startsWith('55') && finalPhone.length === 11) {
                    finalPhone = '55' + finalPhone;
                }
                
                const messageData = {
                    number: finalPhone,
                    text: message
                };

                const result = await callUazAPI('/send/text', 'POST', messageData, false, instanceToken);
                
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
            const instanceToken = instanceTokens.get(barbershopId);
            
            if (!instanceToken) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Instância não encontrada'
                }));
                return;
            }

            console.log(`🔌 Desconectando WhatsApp: ${barbershopId}`);
            
            // Desconectar instância
            await callUazAPI('/instance/disconnect', 'POST', {}, false, instanceToken);
            
            // Deletar instância (sempre que desconectar)
            await callUazAPI('/instance', 'DELETE', null, false, instanceToken);
            
            // Limpar dados locais
            instanceTokens.delete(barbershopId);
            instanceStatus.delete(barbershopId);
            
            // Limpar do Supabase
            await clearInstanceFromSupabase(barbershopId);
            
            console.log('✅ WhatsApp desconectado e instância deletada');
            
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
            const instanceToken = instanceTokens.get(barbershopId);

            console.log(`🔄 Resetando WhatsApp: ${barbershopId}`);
            
            if (instanceToken) {
                // Tentar desconectar e deletar instância
                try {
                    await callUazAPI('/instance/disconnect', 'POST', {}, false, instanceToken);
                } catch (disconnectError) {
                    console.log('⚠️ Erro ao desconectar (pode já estar desconectado):', disconnectError.message);
                }
                
                try {
                    await callUazAPI('/instance', 'DELETE', null, false, instanceToken);
                } catch (deleteError) {
                    console.log('⚠️ Erro ao deletar instância:', deleteError.message);
                }
            }
            
            // Limpar dados locais
            instanceTokens.delete(barbershopId);
            instanceStatus.delete(barbershopId);
            
            // Limpar do Supabase
            await clearInstanceFromSupabase(barbershopId);
            
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

    // Listar instâncias ativas
    if (pathname === '/api/whatsapp/instances' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            instances: Array.from(instanceStatus.entries()).map(([id, data]) => ({
                id,
                ...data,
                token: data.instanceToken ? `${data.instanceToken.substring(0, 10)}...` : null
            })),
            total: instanceStatus.size,
            tokens: Array.from(instanceTokens.keys()),
            tokenMap: Array.from(instanceTokens.entries()).map(([id, token]) => ({
                barbershopId: id,
                token: `${token.substring(0, 10)}...`
            }))
        }));
        return;
    }

    // Debug tokens
    if (pathname === '/api/debug/tokens' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            adminToken: UAZ_ADMIN_TOKEN ? `${UAZ_ADMIN_TOKEN.substring(0, 10)}...` : 'não configurado',
            instanceTokens: Array.from(instanceTokens.entries()).map(([id, token]) => ({
                barbershopId: id,
                token: token ? `${token.substring(0, 10)}...` : 'null',
                fullToken: token // REMOVER EM PRODUÇÃO
            })),
            instanceStatus: Array.from(instanceStatus.entries())
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

// Socket.IO apenas para compatibilidade
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
    console.log(`🔑 Admin Token: ${UAZ_ADMIN_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
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