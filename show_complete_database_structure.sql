-- SCRIPT COMPLETO PARA MOSTRAR TODA ESTRUTURA DO BANCO
-- Execute este script no Supabase SQL Editor

-- ========================================
-- 1. LISTAR TODAS AS TABELAS
-- ========================================
SELECT 
    '🗂️ TABELAS EXISTENTES' as secao,
    table_name as tabela,
    table_type as tipo
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 2. ESTRUTURA COMPLETA DE CADA TABELA
-- ========================================

-- APPOINTMENTS
SELECT 
    '📅 APPOINTMENTS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;

-- BARBERSHOPS
SELECT 
    '🏪 BARBERSHOPS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'barbershops'
ORDER BY ordinal_position;

-- CLIENTS
SELECT 
    '👥 CLIENTS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

-- SERVICES
SELECT 
    '✂️ SERVICES' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'services'
ORDER BY ordinal_position;

-- STAFF_MEMBERS
SELECT 
    '👨‍💼 STAFF_MEMBERS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'staff_members'
ORDER BY ordinal_position;

-- USERS
SELECT 
    '👤 USERS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- WHATSAPP_SESSIONS (se existir)
SELECT 
    '📱 WHATSAPP_SESSIONS' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'whatsapp_sessions'
ORDER BY ordinal_position;

-- WHATSAPP_TEMPLATES (se existir)
SELECT 
    '📝 WHATSAPP_TEMPLATES' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'whatsapp_templates'
ORDER BY ordinal_position;

-- WHATSAPP_MESSAGES (se existir)
SELECT 
    '💬 WHATSAPP_MESSAGES' as tabela,
    column_name as coluna,
    data_type as tipo,
    character_maximum_length as tamanho,
    is_nullable as permite_null,
    column_default as valor_padrao
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'whatsapp_messages'
ORDER BY ordinal_position;

-- ========================================
-- 3. TODAS AS OUTRAS TABELAS (caso existam mais)
-- ========================================
SELECT 
    '📋 OUTRAS TABELAS' as secao,
    table_name as tabela,
    column_name as coluna,
    data_type as tipo,
    is_nullable as permite_null
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name NOT IN ('appointments', 'barbershops', 'clients', 'services', 'staff_members', 'users', 'whatsapp_sessions', 'whatsapp_templates', 'whatsapp_messages')
ORDER BY table_name, ordinal_position;

-- ========================================
-- 4. FOREIGN KEYS (RELACIONAMENTOS)
-- ========================================
SELECT 
    '🔗 FOREIGN KEYS' as secao,
    tc.table_name as tabela_origem,
    kcu.column_name as coluna_origem,
    ccu.table_name as tabela_destino,
    ccu.column_name as coluna_destino,
    tc.constraint_name as nome_constraint
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 5. ÍNDICES
-- ========================================
SELECT 
    '📊 ÍNDICES' as secao,
    tablename as tabela,
    indexname as nome_indice,
    indexdef as definicao
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- 6. POLÍTICAS RLS
-- ========================================
SELECT 
    '🔒 POLÍTICAS RLS' as secao,
    tablename as tabela,
    policyname as nome_politica,
    permissive as permissiva,
    cmd as comando,
    qual as condicao
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 7. FUNÇÕES DISPONÍVEIS
-- ========================================
SELECT 
    '⚙️ FUNÇÕES UUID' as secao,
    proname as nome_funcao,
    CASE 
        WHEN proname = 'uuid_generate_v4' THEN '✅ Disponível'
        WHEN proname = 'gen_random_uuid' THEN '✅ Disponível'
        ELSE '📋 Outra'
    END as status
FROM pg_proc 
WHERE proname IN ('uuid_generate_v4', 'gen_random_uuid')
ORDER BY proname;

-- ========================================
-- 8. EXTENSÕES INSTALADAS
-- ========================================
SELECT 
    '🔧 EXTENSÕES' as secao,
    extname as nome_extensao,
    extversion as versao
FROM pg_extension
ORDER BY extname;