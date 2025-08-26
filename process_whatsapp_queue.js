// Processador de fila de mensagens WhatsApp
// Este script pode ser executado como um cron job ou worker

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase (usar variáveis de ambiente em produção)
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = "https://hairfycombr.uazapi.com";

async function processMessageQueue() {
    console.log('🔄 Processando fila de mensagens WhatsApp...');
    
    try {
        // Buscar mensagens pendentes (máximo 10 por vez)
        const { data: messages, error } = await supabase
            .from('whatsapp_message_queue')
            .select('*')
            .eq('status', 'pending')
            .lt('attempts', 3) // Máximo 3 tentativas
            .order('created_at', { ascending: true })
            .limit(10);

        if (error) {
            console.error('❌ Erro ao buscar mensagens:', error);
            return;
        }

        if (!messages || messages.length === 0) {
            console.log('✅ Nenhuma mensagem pendente na fila');
            return;
        }

        console.log(`📨 Processando ${messages.length} mensagens...`);

        for (const message of messages) {
            await processMessage(message);
            // Aguardar 1 segundo entre mensagens para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Processamento da fila concluído');

    } catch (error) {
        console.error('❌ Erro no processamento da fila:', error);
    }
}

async function processMessage(message) {
    console.log(`📤 Enviando mensagem para +${message.phone_number}...`);

    try {
        // Limpar número (remover caracteres especiais)
        const cleanNumber = message.phone_number.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

        // Enviar mensagem via API
        const response = await fetch(`${API_BASE}/send/text`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'token': message.instance_token
            },
            body: JSON.stringify({
                number: finalNumber,
                text: message.message
            })
        });

        const result = await response.json();

        if (response.ok && result) {
            // Mensagem enviada com sucesso
            await supabase
                .from('whatsapp_message_queue')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    attempts: message.attempts + 1
                })
                .eq('id', message.id);

            console.log(`✅ Mensagem enviada para +${finalNumber}`);

        } else {
            throw new Error(result.error || 'Erro desconhecido da API');
        }

    } catch (error) {
        console.error(`❌ Erro ao enviar mensagem:`, error.message);

        // Incrementar tentativas
        const newAttempts = message.attempts + 1;
        const updateData = {
            attempts: newAttempts,
            error_message: error.message
        };

        // Se excedeu o máximo de tentativas, marcar como falhou
        if (newAttempts >= message.max_attempts) {
            updateData.status = 'failed';
            updateData.failed_at = new Date().toISOString();
        }

        await supabase
            .from('whatsapp_message_queue')
            .update(updateData)
            .eq('id', message.id);
    }
}

// Executar processamento
if (require.main === module) {
    processMessageQueue()
        .then(() => {
            console.log('🏁 Processamento finalizado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

module.exports = { processMessageQueue };