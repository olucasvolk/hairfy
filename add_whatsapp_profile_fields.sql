-- Adicionar campos para perfil do WhatsApp
-- Execute este script no SQL Editor do Supabase

-- Adicionar colunas para informações do perfil
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS profile_name TEXT;

ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN public.whatsapp_sessions.profile_name IS 'Nome do perfil do WhatsApp conectado';
COMMENT ON COLUMN public.whatsapp_sessions.profile_pic_url IS 'URL da foto do perfil do WhatsApp';

-- Verificar estrutura atualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN column_name IN ('profile_name', 'profile_pic_url') THEN '✅ NOVO' 
        ELSE '' 
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_sessions'
ORDER BY ordinal_position;