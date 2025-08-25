-- BarberFlow SaaS - Script Completo de Correção
-- Execute este script completo no SQL Editor do Supabase

-- 1. PRIMEIRO: Execute o script de diagnóstico para ver o estado atual
-- (Cole e execute o conteúdo de database_debug.sql primeiro)

-- 2. Limpar e recriar tudo se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recriar a função de criação de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user into public.users table
    INSERT INTO public.users (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email
    );

    -- Create barbershop if barbershop_name is provided
    IF NEW.raw_user_meta_data->>'barbershop_name' IS NOT NULL THEN
        INSERT INTO public.barbershops (owner_id, name)
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'barbershop_name'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar o trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Garantir que RLS está habilitado e políticas existem
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- 6. Recriar políticas essenciais (drop se existir)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Políticas para barbershops
DROP POLICY IF EXISTS "Users can view own barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Users can insert own barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Users can update own barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Users can delete own barbershops" ON public.barbershops;

CREATE POLICY "Users can view own barbershops" ON public.barbershops
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own barbershops" ON public.barbershops
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own barbershops" ON public.barbershops
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own barbershops" ON public.barbershops
    FOR DELETE USING (auth.uid() = owner_id);

-- 8. Inserir planos se não existirem
INSERT INTO public.subscription_plans (name, plan_type, price_monthly, price_yearly, max_staff, features) 
SELECT * FROM (VALUES
    ('Plano Básico', 'basico'::plan_type, 2990, 29900, 2, ARRAY['Até 2 profissionais', 'Agendamento online', 'Gestão de clientes', 'Relatórios básicos', 'Suporte por email']),
    ('Plano Profissional', 'profissional'::plan_type, 4990, 49900, 10, ARRAY['Até 10 profissionais', 'Agendamento online', 'Gestão de clientes', 'Gestão de produtos e estoque', 'Controle de vendas', 'Relatórios avançados', 'Integração WhatsApp', 'Suporte prioritário']),
    ('Plano Premium', 'premium'::plan_type, 9990, 99900, NULL, ARRAY['Profissionais ilimitados', 'Agendamento online', 'Gestão completa de clientes', 'Gestão de produtos e estoque', 'Controle de vendas', 'Relatórios completos e personalizados', 'Integração WhatsApp', 'Sistema de fidelidade', 'API personalizada', 'Suporte 24/7', 'Treinamento personalizado'])
) AS v(name, plan_type, price_monthly, price_yearly, max_staff, features)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans);

-- 9. Verificar se tudo foi criado corretamente
SELECT 'Tabelas criadas:' as status, count(*) as total 
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT 'Políticas criadas:' as status, count(*) as total 
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 'Funções criadas:' as status, count(*) as total 
FROM information_schema.routines 
WHERE routine_schema = 'public';

SELECT 'Planos disponíveis:' as status, count(*) as total 
FROM public.subscription_plans;