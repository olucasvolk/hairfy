-- Adicionar coluna para armazenar o token da instância UAZ API
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna instance_token na tabela whatsapp_sessions
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS instance_token TEXT;

-- Adicionar coluna instance_id para armazenar o ID da instância UAZ
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS instance_id TEXT;

-- Adicionar índice para busca rápida por instance_token
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance_token 
ON public.whatsapp_sessions(instance_token);

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;