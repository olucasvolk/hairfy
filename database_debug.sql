-- BarberFlow SaaS - Script de Diagnóstico
-- Execute este script para verificar o estado do banco

-- 1. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 4. Verificar se as funções existem
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- 5. Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;

-- 6. Verificar usuários na tabela users
SELECT id, full_name, email, created_at 
FROM public.users 
ORDER BY created_at DESC;

-- 7. Verificar barbearias
SELECT id, owner_id, name, created_at 
FROM public.barbershops 
ORDER BY created_at DESC;

-- 8. Verificar planos de assinatura
SELECT id, name, plan_type, price_monthly 
FROM public.subscription_plans 
ORDER BY price_monthly;