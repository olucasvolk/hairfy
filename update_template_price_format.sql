-- Atualizar templates para usar formato correto de preço
-- O template deve ter "R$ {preco}" em vez de só "{preco}"

UPDATE whatsapp_templates 
SET message = REPLACE(message, '💰 Valor: {preco}', '💰 Valor: R$ {preco}')
WHERE message LIKE '%💰 Valor: {preco}%'
AND message NOT LIKE '%R$ {preco}%';

-- Verificar se há outros formatos de preço para corrigir
UPDATE whatsapp_templates 
SET message = REPLACE(message, 'Valor: {preco}', 'Valor: R$ {preco}')
WHERE message LIKE '%Valor: {preco}%'
AND message NOT LIKE '%R$ {preco}%';

-- Verificar resultado
SELECT 
    'TEMPLATES COM PREÇO ATUALIZADOS' as info,
    template_type,
    name,
    CASE 
        WHEN message LIKE '%R$ {preco}%' THEN '✅ Formato correto'
        WHEN message LIKE '%{preco}%' THEN '⚠️ Pode precisar de R$'
        ELSE '📋 Sem preço'
    END as status_preco,
    LEFT(message, 200) as preview
FROM whatsapp_templates
WHERE message LIKE '%{preco}%'
ORDER BY template_type;