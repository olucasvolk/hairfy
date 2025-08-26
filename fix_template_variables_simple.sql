-- SCRIPT SIMPLES PARA CORRIGIR VARIÁVEIS DOS TEMPLATES

-- 1. Atualizar templates existentes para usar formato correto
UPDATE whatsapp_templates 
SET message = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(message, 
                            '{{client_name}}', '{cliente_nome}'),
                        '{{appointment_date}}', '{data}'),
                    '{{appointment_time}}', '{horario}'),
                '{{service_name}}', '{servico}'),
            '{{service_price}}', 'R$ 50,00'),
        '{{barbershop_name}}', '{barbearia_nome}'),
    '{{barbershop_address}}', '{barbearia_endereco}')
WHERE message LIKE '%{{%}}%';

-- 2. Verificar resultado
SELECT 
    'RESULTADO DA CORREÇÃO' as info,
    template_type,
    name,
    CASE 
        WHEN message LIKE '%{{%}}%' THEN '❌ Ainda tem variáveis antigas'
        WHEN message LIKE '%{%}%' THEN '✅ Variáveis corrigidas'
        ELSE '📋 Sem variáveis'
    END as status,
    LEFT(message, 150) as preview
FROM whatsapp_templates
ORDER BY template_type;

-- 3. Estatísticas
SELECT 
    '📊 ESTATÍSTICAS' as info,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN message LIKE '%{%}%' AND message NOT LIKE '%{{%}}%' THEN 1 END) as templates_corretos,
    COUNT(CASE WHEN message LIKE '%{{%}}%' THEN 1 END) as templates_antigos
FROM whatsapp_templates;