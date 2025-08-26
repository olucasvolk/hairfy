-- Verificar estrutura atual das tabelas WhatsApp existentes

-- Verificar se whatsapp_templates existe e sua estrutura
SELECT 
    'WHATSAPP_TEMPLATES EXISTENTE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se whatsapp_sessions existe e sua estrutura
SELECT 
    'WHATSAPP_SESSIONS EXISTENTE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se whatsapp_message_queue existe e sua estrutura
SELECT 
    'WHATSAPP_MESSAGE_QUEUE EXISTENTE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_message_queue' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar dados existentes em whatsapp_templates (se existir)
SELECT 
    'DADOS WHATSAPP_TEMPLATES' as info,
    COUNT(*) as total_templates
FROM whatsapp_templates;

-- Mostrar sample dos dados (se existir)
SELECT 
    'SAMPLE WHATSAPP_TEMPLATES' as info,
    *
FROM whatsapp_templates 
LIMIT 3;