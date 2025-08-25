-- Criar tabela staff_services e suas políticas
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela staff_services (relacionamento many-to-many)
CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, service_id) -- Evitar duplicatas
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_staff_services_staff_id ON public.staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON public.staff_services(service_id);

-- 3. Habilitar RLS
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Users can manage staff services of own barbershops" ON public.staff_services
    FOR ALL USING (
        staff_id IN (
            SELECT sm.id FROM public.staff_members sm
            JOIN public.barbershops b ON sm.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- 5. Verificar se a tabela foi criada
SELECT 
    'Tabela staff_services criada' as status,
    count(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'staff_services';

-- 6. Verificar políticas
SELECT 
    'Políticas RLS criadas' as status,
    count(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'staff_services';

-- 7. Verificar índices
SELECT 
    'Índices criados' as status,
    count(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'staff_services';