-- DIAGNÓSTICO COMPLETO DO WHATSAPP
-- Verificar se tudo está configurado corretamente

-- 1. Verificar sessões WhatsApp
SELECT 
    'SESSÕES WHATSAPP' as info,
    ws.barbershop_id,
    b.name as barbearia_nome,
    ws.instance_token,
    ws.is_connected,
    ws.phone_number,
    ws.created_at
FROM whatsapp_sessions ws
LEFT JOIN barbershops b ON b.id = ws.barbershop_id
ORDER BY ws.created_at DESC;

-- 2. Verificar templates ativos
SELECT 
    'TEMPLATES ATIVOS' as info,
    wt.barbershop_id,
    b.name as barbearia_nome,
    wt.template_type,
    wt.name,
    wt.is_active,
    LEFT(wt.message, 100) as preview_message
FROM whatsapp_templates wt
LEFT JOIN barbershops b ON b.id = wt.barbershop_id
WHERE wt.is_active = true
ORDER BY wt.barbershop_id, wt.template_type;

-- 3. Verificar últimos agendamentos criados
SELECT 
    'ÚLTIMOS AGENDAMENTOS' as info,
    a.id,
    a.barbershop_id,
    b.name as barbearia_nome,
    a.client_name,
    a.client_phone,
    a.status,
    a.created_at
FROM appointments a
LEFT JOIN barbershops b ON b.id = a.barbershop_id
ORDER BY a.created_at DESC
LIMIT 5;

-- 4. Verificar fila de mensagens WhatsApp
SELECT 
    'FILA DE MENSAGENS' as info,
    wmq.barbershop_id,
    b.name as barbearia_nome,
    wmq.phone_number,
    wmq.template_type,
    wmq.status,
    wmq.error_message,
    wmq.sent_at,
    wmq.failed_at,
    wmq.created_at
FROM whatsapp_message_queue wmq
LEFT JOIN barbershops b ON b.id = wmq.barbershop_id
ORDER BY wmq.created_at DESC
LIMIT 10;

-- 5. Verificar se há templates de confirmação para cada barbearia
SELECT 
    'TEMPLATES POR BARBEARIA' as info,
    b.id as barbershop_id,
    b.name as barbearia_nome,
    COUNT(wt.id) as total_templates,
    COUNT(CASE WHEN wt.template_type = 'appointment_confirmed' AND wt.is_active = true THEN 1 END) as templates_confirmacao_ativos
FROM barbershops b
LEFT JOIN whatsapp_templates wt ON wt.barbershop_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;

-- 6. Verificar estrutura das tabelas
SELECT 
    'ESTRUTURA WHATSAPP_SESSIONS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions'
ORDER BY ordinal_position;

SELECT 
    'ESTRUTURA WHATSAPP_TEMPLATES' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_templates'
ORDER BY ordinal_position;