-- Script para limpar e recriar políticas do Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Remover TODAS as políticas existentes do storage.objects
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- 2. Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('staff-avatars', 'staff-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('barbershop-logos', 'barbershop-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('client-avatars', 'client-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Criar políticas simples para staff-avatars
CREATE POLICY "staff_avatars_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "staff_avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'staff-avatars');

CREATE POLICY "staff_avatars_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "staff_avatars_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

-- 4. Criar políticas para barbershop-logos
CREATE POLICY "barbershop_logos_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "barbershop_logos_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'barbershop-logos');

CREATE POLICY "barbershop_logos_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "barbershop_logos_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

-- 5. Criar políticas para client-avatars
CREATE POLICY "client_avatars_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "client_avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'client-avatars');

CREATE POLICY "client_avatars_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "client_avatars_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

-- 6. Verificar se tudo foi criado corretamente
SELECT 'Buckets criados:' as status, count(*) as total
FROM storage.buckets 
WHERE id IN ('staff-avatars', 'barbershop-logos', 'client-avatars');

SELECT 'Políticas criadas:' as status, count(*) as total
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Mostrar detalhes dos buckets
SELECT id, name, public, file_size_limit
FROM storage.buckets 
WHERE id IN ('staff-avatars', 'barbershop-logos', 'client-avatars');

-- Mostrar detalhes das políticas
SELECT policyname, cmd
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;