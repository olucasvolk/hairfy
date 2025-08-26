-- Script seguro para atualizar schema WhatsApp
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar campos para controle de instâncias UAZ API
DO $$ 
BEGIN
    -- Adicionar instance_token se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'whatsapp_sessions' 
        AND column_name = 'instance_token'
    ) THEN
        ALTER TABLE public.whatsapp_sessions ADD COLUMN instance_token TEXT;
        RAISE NOTICE 'Coluna instance_token adicionada';
    ELSE
        RAISE NOTICE 'Coluna instance_token já existe';
    END IF;
    
    -- Adicionar instance_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'whatsapp_sessions' 
        AND column_name = 'instance_id'
    ) THEN
        ALTER TABLE public.whatsapp_sessions ADD COLUMN instance_id TEXT;
        RAISE NOTICE 'Coluna instance_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna instance_id já existe';
    END IF;
END $$;

-- 2. Atualizar comentário do status
COMMENT ON COLUMN public.whatsapp_sessions.status IS 'Status: no_instance, created, connecting, waiting_scan, connected, disconnected, error';

-- 3. Criar índice para busca por token (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'whatsapp_sessions' 
        AND indexname = 'idx_whatsapp_sessions_instance_token'
    ) THEN
        CREATE INDEX idx_whatsapp_sessions_instance_token ON public.whatsapp_sessions(instance_token);
        RAISE NOTICE 'Índice idx_whatsapp_sessions_instance_token criado';
    ELSE
        RAISE NOTICE 'Índice idx_whatsapp_sessions_instance_token já existe';
    END IF;
END $$;

-- 4. Verificar estrutura final
SELECT 
    'whatsapp_sessions' as tabela,
    column_name as coluna, 
    data_type as tipo, 
    is_nullable as permite_null,
    CASE 
        WHEN column_name IN ('instance_token', 'instance_id') THEN '✅ NOVO CAMPO'
        WHEN column_name = 'status' THEN '📝 ATUALIZADO'
        ELSE '📋 EXISTENTE'
    END as status_campo
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_sessions'
ORDER BY ordinal_position;

-- 5. Verificar índices
SELECT 
    'whatsapp_sessions' as tabela,
    indexname as indice,
    CASE 
        WHEN indexname = 'idx_whatsapp_sessions_instance_token' THEN '✅ NOVO ÍNDICE'
        ELSE '📋 EXISTENTE'
    END as status_indice
FROM pg_indexes 
WHERE tablename = 'whatsapp_sessions'
ORDER BY indexname;

-- 6. Resumo final
SELECT 
    'RESUMO DA ATUALIZAÇÃO' as info,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'whatsapp_sessions' AND column_name IN ('instance_token', 'instance_id')) as novos_campos,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'whatsapp_sessions' AND indexname = 'idx_whatsapp_sessions_instance_token') as novos_indices;