const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Função para enviar mensagem via WhatsApp API
async function sendWhatsAppMessage(phone, message, instanceId = 'default') {
  try {
    // Buscar configurações do WhatsApp no banco
    const { data: whatsappConfig, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('is_active', true)
      .single();

    if (error || !whatsappConfig) {
      console.error('❌ Configuração WhatsApp não encontrada:', error?.message);
      return false;
    }

    const { api_url, access_token } = whatsappConfig;
    
    if (!api_url || !access_token) {
      console.error('❌ URL da API ou token não configurados');
      return false;
    }

    // Formatar telefone (remover caracteres especiais)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Enviar mensagem via API
    const response = await axios.post(`${api_url}/send-message`, {
      phone: formattedPhone,
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      console.log(`✅ Mensagem enviada para ${phone}`);
      return true;
    } else {
      console.error(`❌ Erro na API WhatsApp:`, response.data.error);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem WhatsApp:`, error.message);
    return false;
  }
}

// Função para processar lembretes
async function processReminders() {
  try {
    console.log('🔍 Processando lembretes...');
    
    // Buscar agendamentos para amanhã que ainda não tiveram lembrete enviado
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (name, phone),
        services (name, duration),
        staff (name),
        barbershops (name, whatsapp_instance_id)
      `)
      .gte('date', tomorrow.toISOString())
      .lt('date', dayAfterTomorrow.toISOString())
      .eq('status', 'confirmed')
      .is('reminder_sent', false);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('📅 Nenhum agendamento encontrado para amanhã');
      return;
    }

    console.log(`📋 Encontrados ${appointments.length} agendamentos para processar`);

    // Processar cada agendamento
    for (const appointment of appointments) {
      try {
        if (!appointment.clients?.phone) {
          console.log(`⚠️ Cliente sem telefone: ${appointment.clients?.name || 'N/A'}`);
          continue;
        }

        const phone = appointment.clients.phone;
        const instanceId = appointment.barbershops?.whatsapp_instance_id || 'default';
        
        const appointmentDate = new Date(appointment.date);
        const timeStr = appointmentDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const message = `🏪 *Lembrete de Agendamento*\n\n` +
          `Olá ${appointment.clients.name}! 👋\n\n` +
          `Você tem um agendamento marcado para *amanhã*:\n\n` +
          `📅 *Data:* ${appointmentDate.toLocaleDateString('pt-BR')}\n` +
          `⏰ *Horário:* ${timeStr}\n` +
          `💇 *Serviço:* ${appointment.services?.name || 'N/A'}\n` +
          `👨‍💼 *Profissional:* ${appointment.staff?.name || 'N/A'}\n\n` +
          `Nos vemos em breve! 😊`;

        // Enviar mensagem via API do WhatsApp
        const messageSent = await sendWhatsAppMessage(phone, message, instanceId);

        // Marcar como enviado
        await supabase
          .from('appointments')
          .update({ 
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', appointment.id);

        if (messageSent) {
          console.log(`📝 Lembrete enviado e marcado: ${appointment.clients.name}`);
        } else {
          console.log(`⚠️ Marcado como processado (erro no envio): ${appointment.clients.name}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar agendamento ${appointment.id}:`, error);
      }
    }

    console.log('✅ Processamento de lembretes concluído');

  } catch (error) {
    console.error('❌ Erro geral no processamento de lembretes:', error);
  }
}

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    service: 'Hairfy WhatsApp Reminders API',
    version: '1.0.0',
    status: 'active',
    description: 'API para envio automático de lembretes via WhatsApp Business API',
    endpoints: {
      health: 'GET /health',
      processReminders: 'POST /api/reminders/process',
      testWhatsApp: 'POST /api/whatsapp/test'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hairfy-whatsapp-reminders-api',
    reminders: 'active',
    timestamp: new Date().toISOString()
  });
});

// API para processar lembretes manualmente
app.post('/api/reminders/process', async (req, res) => {
  try {
    await processReminders();
    res.json({ success: true, message: 'Lembretes processados com sucesso' });
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para testar envio de mensagem
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const { phone, message, instanceId = 'default' } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Telefone e mensagem são obrigatórios' 
      });
    }

    const sent = await sendWhatsAppMessage(phone, message, instanceId);
    
    res.json({ 
      success: sent, 
      message: sent ? 'Mensagem enviada com sucesso' : 'Erro ao enviar mensagem'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 para outras rotas
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    service: 'Hairfy WhatsApp Reminders API',
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      processReminders: 'POST /api/reminders/process',
      testWhatsApp: 'POST /api/whatsapp/test'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Lembretes WhatsApp API rodando na porta ${PORT}`);
  console.log(`📱 Sistema otimizado para WhatsApp Business API`);
  
  // Configurar cron job para lembretes
  console.log('⏰ Configurando cron job para lembretes...');
  
  // Rodar a cada hora (minuto 0)
  cron.schedule('0 * * * *', () => {
    console.log('🕐 Cron job executado - processando lembretes...');
    processReminders();
  });
  
  // Executar uma vez ao iniciar (após 30 segundos)
  setTimeout(() => {
    console.log('🧪 Executando verificação inicial de lembretes...');
    processReminders();
  }, 30000);
  
  console.log('✅ Sistema de lembretes ativo!');
});