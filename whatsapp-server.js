import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Armazenar clientes WhatsApp por barbershop
const whatsappClients = new Map();

// Configurar cliente WhatsApp
function createWhatsAppClient(barbershopId) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `barbershop_${barbershopId}`
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

  client.on('qr', (qr) => {
    console.log(`QR Code gerado para barbearia ${barbershopId}`);
    qrcode.toDataURL(qr, (err, url) => {
      if (!err) {
        io.emit(`qr_${barbershopId}`, { qr: url });
      }
    });
  });

  client.on('ready', () => {
    console.log(`WhatsApp conectado para barbearia ${barbershopId}`);
    io.emit(`ready_${barbershopId}`, { 
      status: 'connected',
      phone: client.info.wid.user 
    });
  });

  client.on('authenticated', () => {
    console.log(`WhatsApp autenticado para barbearia ${barbershopId}`);
    io.emit(`authenticated_${barbershopId}`, { status: 'authenticated' });
  });

  client.on('auth_failure', (msg) => {
    console.error(`Falha na autenticação para barbearia ${barbershopId}:`, msg);
    io.emit(`auth_failure_${barbershopId}`, { error: msg });
  });

  client.on('disconnected', (reason) => {
    console.log(`WhatsApp desconectado para barbearia ${barbershopId}:`, reason);
    io.emit(`disconnected_${barbershopId}`, { reason });
    whatsappClients.delete(barbershopId);
  });

  return client;
}

// Rotas da API
app.post('/api/whatsapp/connect/:barbershopId', async (req, res) => {
  const { barbershopId } = req.params;
  
  try {
    if (whatsappClients.has(barbershopId)) {
      return res.json({ success: false, message: 'WhatsApp já está conectado para esta barbearia' });
    }

    const client = createWhatsAppClient(barbershopId);
    whatsappClients.set(barbershopId, client);
    
    await client.initialize();
    
    res.json({ success: true, message: 'Inicializando conexão WhatsApp' });
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp/disconnect/:barbershopId', async (req, res) => {
  const { barbershopId } = req.params;
  
  try {
    const client = whatsappClients.get(barbershopId);
    if (client) {
      console.log(`Desconectando WhatsApp para barbearia ${barbershopId}`);
      await client.logout();
      await client.destroy();
      whatsappClients.delete(barbershopId);
      
      // Emitir evento de desconexão
      io.emit(`disconnected_${barbershopId}`, { reason: 'Manual disconnect' });
    }
    
    res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp/send/:barbershopId', async (req, res) => {
  const { barbershopId } = req.params;
  const { phone, message } = req.body;
  
  try {
    const client = whatsappClients.get(barbershopId);
    if (!client) {
      return res.status(400).json({ success: false, error: 'WhatsApp não está conectado' });
    }

    // Formatar número de telefone
    const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
    
    await client.sendMessage(formattedPhone, message);
    
    res.json({ success: true, message: 'Mensagem enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/whatsapp/status/:barbershopId', async (req, res) => {
  const { barbershopId } = req.params;
  const client = whatsappClients.get(barbershopId);
  
  if (!client) {
    return res.json({ connected: false });
  }
  
  try {
    const info = client.info;
    const state = await client.getState();
    
    res.json({ 
      connected: state === 'CONNECTED',
      state: state,
      phone: info ? info.wid.user : null
    });
  } catch (error) {
    res.json({ 
      connected: false,
      error: error.message
    });
  }
});

app.post('/api/whatsapp/test/:barbershopId', async (req, res) => {
  const { barbershopId } = req.params;
  const { phone, message } = req.body;
  
  try {
    const client = whatsappClients.get(barbershopId);
    if (!client) {
      return res.status(400).json({ success: false, error: 'WhatsApp não está conectado' });
    }

    const state = await client.getState();
    if (state !== 'CONNECTED') {
      return res.status(400).json({ success: false, error: 'WhatsApp não está conectado' });
    }

    // Formatar número de telefone
    const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
    
    await client.sendMessage(formattedPhone, message);
    
    res.json({ success: true, message: 'Mensagem de teste enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor WhatsApp rodando na porta ${PORT}`);
});