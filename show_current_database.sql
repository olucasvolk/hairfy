-- Execute este script no Supabase SQL Editor para me mostrar seu banco atual

-- 1. TABELAS EXISTENTES
SELECT '=== TABELAS EXISTENTES ===' as info;
SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE 'whatsapp%' THEN '📱 WhatsApp'
        WHEN table_name IN ('barbershops', 'appointments', 'clients', 'services', 'staff_members') THEN '🏪 Core'
        ELSE '📋 Outras'
    END as categoria
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY categoria, table_name;

-- 2. ESTRUTURA WHATSAPP_SESSIONS (se existir)
SELECT '=== WHATSAPP_SESSIONS ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. ESTRUTURA WHATSAPP_TEMPLATES (se existir)
SELECT '=== WHATSAPP_TEMPLATES ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. ESTRUTURA BARBERSHOPS
SELECT '=== BARBERSHOPS ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. ESTRUTURA APPOINTMENTS
SELECT '=== APPOINTMENTS ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. FOREIGN KEYS WHATSAPP
SELECT '=== FOREIGN KEYS WHATSAPP ===' as info;
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS references_table,
    ccu.column_name AS references_column 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'whatsapp%'
ORDER BY tc.table_name;

-- 7. DADOS EXISTENTES (sample)
SELECT '=== DADOS WHATSAPP_SESSIONS ===' as info;
SELECT 
    id,
    barbershop_id,
    status,
    is_connected,
    instance_token IS NOT NULL as has_token,
    phone_number,
    created_at
FROM whatsapp_sessions 
LIMIT 3;

SELECT '=== DADOS WHATSAPP_TEMPLATES ===' as info;
SELECT 
    id,
    barbershop_id,
    template_type,
    template_name,
    is_active,
    LENGTH(message_template) as message_length
FROM whatsapp_templates 
LIMIT 5;