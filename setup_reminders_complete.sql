-- CONFIGURAÇÃO COMPLETA DO SISTEMA DE LEMBRETES WHATSAPP
-- Execute este script completo no Supabase SQL Editor

-- ========================================
-- 1. ADICIONAR COLUNA REMINDER_SENT
-- ========================================

-- Adicionar coluna reminder_sent
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Criar índice para otimizar consultas de lembretes
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments (appointment_date, reminder_sent, status) 
WHERE status IN ('agendado', 'confirmado');

-- ========================================
-- 2. CORRIGIR TEMPLATES WHATSAPP
-- ========================================

-- Atualizar templates existentes para usar formato correto
UPDATE whatsapp_templates 
SET message = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(message, 
                            '{{client_name}}', '{cliente_nome}'),
                        '{{appointment_date}}', '{data}'),
                    '{{appointment_time}}', '{horario}'),
                '{{service_name}}', '{servico}'),
            '{{service_price}}', 'R$ {preco}'),
        '{{barbershop_name}}', '{barbearia_nome}'),
    '{{barbershop_address}}', '{barbearia_endereco}')
WHERE message LIKE '%{{%}}%';

-- ========================================
-- 3. CRIAR TEMPLATES PADRÃO DE LEMBRETE
-- ========================================

-- Template de confirmação (se não existir)
INSERT INTO whatsapp_templates (barbershop_id, template_type, name, message, is_active)
SELECT 
    b.id,
    'appointment_confirmed',
    'Agendamento Confirmado',
    '✅ *Agendamento Confirmado!*

Olá {cliente_nome}! 

Seu agendamento foi confirmado com sucesso:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Obrigado por escolher nossos serviços! 
Até breve! 😊',
    true
FROM barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'appointment_confirmed'
);

-- Template de lembrete (se não existir)
INSERT INTO whatsapp_templates (barbershop_id, template_type, name, message, is_active)
SELECT 
    b.id,
    'appointment_reminder',
    'Lembrete de Agendamento',
    '⏰ *Lembrete de Agendamento*

Olá {cliente_nome}! 

Lembrando que você tem um agendamento *amanhã*:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.',
    true
FROM barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'appointment_reminder'
);

-- ========================================
-- 4. VERIFICAÇÕES FINAIS
-- ========================================

-- Verificar coluna reminder_sent
SELECT 
    '✅ COLUNA REMINDER_SENT' as status,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'reminder_sent';

-- Verificar templates
SELECT 
    '✅ TEMPLATES CONFIGURADOS' as status,
    template_type,
    name,
    is_active,
    LEFT(message, 50) as preview
FROM whatsapp_templates
ORDER BY template_type, name;

-- Verificar agendamentos recentes
SELECT 
    '✅ AGENDAMENTOS ATUALIZADOS' as status,
    id,
    client_name,
    appointment_date,
    status,
    COALESCE(reminder_sent, false) as reminder_sent,
    created_at
FROM appointments 
ORDER BY created_at DESC 
LIMIT 5;

-- Estatísticas finais
SELECT 
    '🎯 CONFIGURAÇÃO CONCLUÍDA!' as resultado,
    (SELECT COUNT(*) FROM barbershops) as total_barbearias,
    (SELECT COUNT(*) FROM whatsapp_templates WHERE template_type = 'appointment_confirmed') as templates_confirmacao,
    (SELECT COUNT(*) FROM whatsapp_templates WHERE template_type = 'appointment_reminder') as templates_lembrete,
    (SELECT COUNT(*) FROM appointments WHERE appointment_date >= CURRENT_DATE) as agendamentos_futuros;