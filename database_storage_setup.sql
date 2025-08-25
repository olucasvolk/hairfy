-- BarberFlow SaaS - Configuração do Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Criar bucket para avatars de profissionais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'staff-avatars',
    'staff-avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Criar bucket para logos de barbearias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'barbershop-logos',
    'barbershop-logos',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 3. Criar bucket para avatars de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-avatars',
    'client-avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de acesso para staff-avatars (mais simples e funcional)
CREATE POLICY "Users can upload staff avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view staff avatars" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'staff-avatars'
    );

CREATE POLICY "Users can update staff avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete staff avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'staff-avatars' AND
        auth.role() = 'authenticated'
    );

-- 5. Políticas de acesso para barbershop-logos
CREATE POLICY "Users can upload barbershop logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view barbershop logos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'barbershop-logos'
    );

CREATE POLICY "Users can update barbershop logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete barbershop logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'barbershop-logos' AND
        auth.role() = 'authenticated'
    );

-- 6. Políticas de acesso para client-avatars
CREATE POLICY "Users can upload client avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view client avatars" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'client-avatars'
    );

CREATE POLICY "Users can update client avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete client avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'client-avatars' AND
        auth.role() = 'authenticated'
    );

-- 7. Verificar se os buckets foram criados
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('staff-avatars', 'barbershop-logos', 'client-avatars');