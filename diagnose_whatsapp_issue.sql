-- DIAGNÓSTICO COMPLETO DO SISTEMA WHATSAPP
-- Execute este script e me mande o resultado

-- 1. Verificar se tabelas WhatsApp existem
SELECT 
    'TABELAS WHATSAPP' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sessions') 
        THEN '✅ whatsapp_sessions existe'
        ELSE '❌ whatsapp_sessions NÃO existe'
    END as whatsapp_sessions,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') 
        THEN '✅ whatsapp_templates existe'
        ELSE '❌ whatsapp_templates NÃO existe'
    END as whatsapp_templates,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_messages') 
        THEN '✅ whatsapp_messages existe'
        ELSE '❌ whatsapp_messages NÃO existe'
    END as whatsapp_messages;

-- 2. Se whatsapp_templates existe, verificar estrutura
DO $
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        RAISE NOTICE '=== ESTRUTURA WHATSAPP_TEMPLATES ===';
        PERFORM column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_templates' 
        ORDER BY ordinal_position;
    ELSE
        RAISE NOTICE '❌ Tabela whatsapp_templates não existe';
    END IF;
END $;

-- 3. Verificar se barbershops tem owner_id
SELECT 
    'BARBERSHOPS' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'barbershops' AND column_name = 'owner_id'
        ) 
        THEN '✅ owner_id existe'
        ELSE '❌ owner_id NÃO existe'
    END as owner_id_status;

-- 4. Verificar função uuid_generate_v4
SELECT 
    'FUNÇÕES' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') 
        THEN '✅ uuid_generate_v4 disponível'
        ELSE '❌ uuid_generate_v4 NÃO disponível - usar gen_random_uuid()'
    END as uuid_function;

-- 5. Verificar função gen_random_uuid
SELECT 
    'FUNÇÕES' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') 
        THEN '✅ gen_random_uuid disponível'
        ELSE '❌ gen_random_uuid NÃO disponível'
    END as gen_random_uuid_function;

-- 6. Testar criação de UUID
SELECT 
    'TESTE UUID' as teste,
    gen_random_uuid() as uuid_gerado;

-- 7. Verificar se extensão pgcrypto está habilitada
SELECT 
    'EXTENSÕES' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') 
        THEN '✅ pgcrypto habilitada'
        ELSE '❌ pgcrypto NÃO habilitada'
    END as pgcrypto_status;

-- 8. Listar todas as tabelas do sistema
SELECT 
    'TODAS AS TABELAS' as info,
    string_agg(table_name, ', ' ORDER BY table_name) as tabelas_existentes
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 9. Se whatsapp_templates existe, mostrar dados
DO $
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        RAISE NOTICE '=== DADOS WHATSAPP_TEMPLATES ===';
        -- Não podemos fazer SELECT em DO block, então só notificamos
        RAISE NOTICE 'Tabela existe - verifique dados manualmente';
    END IF;
END $;