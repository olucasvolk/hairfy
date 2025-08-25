-- Adicionar colunas que estão faltando nas tabelas
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna include_in_revenue na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS include_in_revenue BOOLEAN DEFAULT true;

-- 2. Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales' 
AND column_name = 'include_in_revenue';

-- 3. Atualizar registros existentes (se houver)
UPDATE public.sales 
SET include_in_revenue = true 
WHERE include_in_revenue IS NULL;

-- 4. Verificar outras colunas que podem estar faltando
-- Verificar estrutura completa da tabela sales
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela sale_items
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sale_items'
ORDER BY ordinal_position;