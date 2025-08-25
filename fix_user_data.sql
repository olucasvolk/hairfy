-- Script para corrigir dados do usuário atual
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o usuário existe na tabela auth.users
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE id = 'd8afb9d5-f47e-4666-857e-cf37c91db93c';

-- 2. Verificar se o usuário existe na tabela public.users
SELECT id, full_name, email 
FROM public.users 
WHERE id = 'd8afb9d5-f47e-4666-857e-cf37c91db93c';

-- 3. Inserir o usuário na tabela public.users se não existir
INSERT INTO public.users (id, full_name, email)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.email
FROM auth.users au
WHERE au.id = 'd8afb9d5-f47e-4666-857e-cf37c91db93c'
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- 4. Verificar se foi inserido corretamente
SELECT id, full_name, email, created_at 
FROM public.users 
WHERE id = 'd8afb9d5-f47e-4666-857e-cf37c91db93c';