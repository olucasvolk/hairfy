-- Criar tabela para templates do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    template_type VARCHAR(50) NOT NULL, -- 'appointment_confirmed', 'appointment_reminder'
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada barbearia tenha apenas um template de cada tipo
    UNIQUE(barbershop_id, template_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_barbershop_id ON whatsapp_templates(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON whatsapp_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON whatsapp_templates(is_active);

-- RLS (Row Level Security)
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados verem apenas templates da sua barbearia
CREATE POLICY "Users can view templates from their barbershop" ON whatsapp_templates
    FOR SELECT USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para usuários autenticados criarem templates na sua barbearia
CREATE POLICY "Users can insert templates in their barbershop" ON whatsapp_templates
    FOR INSERT WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para usuários autenticados atualizarem templates da sua barbearia
CREATE POLICY "Users can update templates from their barbershop" ON whatsapp_templates
    FOR UPDATE USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para usuários autenticados deletarem templates da sua barbearia
CREATE POLICY "Users can delete templates from their barbershop" ON whatsapp_templates
    FOR DELETE USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Comentários
COMMENT ON TABLE whatsapp_templates IS 'Templates de mensagens WhatsApp para cada barbearia';
COMMENT ON COLUMN whatsapp_templates.template_type IS 'Tipo do template: appointment_confirmed, appointment_reminder';
COMMENT ON COLUMN whatsapp_templates.message IS 'Mensagem do template com variáveis como {cliente_nome}, {data}, etc';
COMMENT ON COLUMN whatsapp_templates.is_active IS 'Se o template está ativo para envio automático';