-- Script para corrigir políticas do Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can upload staff avatars for own barbershops" ON storage.objects;
DROP POLICY IF EXISTS "Users can view staff avatars for own barbershops" ON storage.objects;
DROP POLICY IF EXISTS "Users can update staff avatars for own barbershops" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete staff avatars for own barbershops" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete barbershop logos" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete client avatars" ON storage.objects;

-- 2. Criar políticas simples e funcionais
CREATE POLICY "Allow authenticated uploads to staff-avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public read of staff-avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'staff-avatars');

CREATE POLICY "Allow authenticated updates to staff-avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated deletes from staff-avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

-- 3. Políticas para barbershop-logos
CREATE POLICY "Allow authenticated uploads to barbershop-logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public read of barbershop-logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'barbershop-logos');

CREATE POLICY "Allow authenticated updates to barbershop-logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated deletes from barbershop-logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

-- 4. Políticas para client-avatars
CREATE POLICY "Allow authenticated uploads to client-avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public read of client-avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'client-avatars');

CREATE POLICY "Allow authenticated updates to client-avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated deletes from client-avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

-- 5. Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;