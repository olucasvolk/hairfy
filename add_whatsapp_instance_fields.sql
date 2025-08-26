-- Adicionar campos para controle de instâncias UAZ API
-- Execute este script no SQL Editor do Supabase

-- Adicionar campos para token da instância e ID da instância
DO $$ 
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_sessions' AND column_name = 'instance_token') THEN
        ALTER TABLE public.whatsapp_sessions ADD COLUMN instance_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_sessions' AND column_name = 'instance_id') THEN
        ALTER TABLE public.whatsapp_sessions ADD COLUMN instance_id TEXT;
    END IF;
END $$;

-- Atualizar comentário do status
COMMENT ON COLUMN public.whatsapp_sessions.status IS 'Status: no_instance, created, connecting, waiting_scan, connected, disconnected, error';

-- Criar índice para busca por token (se não existir)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance_token ON public.whatsapp_sessions(instance_token);

-- Verificar estrutura atualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE WHEN column_name IN ('instance_token', 'instance_id') THEN '✅ NOVO' ELSE '' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_sessions'
ORDER BY ordinal_position;