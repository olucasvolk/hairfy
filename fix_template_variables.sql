-- CORRIGIR VARIÁVEIS DOS TEMPLATES WHATSAPP
-- Este script atualiza os templates para usar o formato correto de variáveis

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

-- Verificar templates atualizados
SELECT 
    'TEMPLATES ATUALIZADOS' as info,
    template_type,
    name,
    LEFT(message, 100) as preview_message
FROM whatsapp_templates
ORDER BY template_type;

-- Inserir templates com formato correto para barbearias que não têm
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

� **Endereço:* {barbearia_endereco}

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.',
    true
FROM barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'appointment_reminder'
);

-- Resultado final
SELECT 
    '🎯 TEMPLATES CORRIGIDOS!' as status,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN message LIKE '%{%}%' THEN 1 END) as templates_com_variaveis_corretas,
    COUNT(CASE WHEN message LIKE '%{{%}}%' THEN 1 END) as templates_com_variaveis_antigas
FROM whatsapp_templates;