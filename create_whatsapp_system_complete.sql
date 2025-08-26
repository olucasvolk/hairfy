-- SISTEMA WHATSAPP COMPLETO - COMPATÍVEL COM SUA ESTRUTURA
-- Execute este script no Supabase SQL Editor

-- ========================================
-- 1. TABELA WHATSAPP_SESSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE UNIQUE,
    instance_token TEXT,
    instance_id TEXT,
    phone_number TEXT,
    profile_name TEXT,
    profile_pic_url TEXT,
    is_connected BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'disconnected', -- disconnected, connecting, waiting_scan, connected, error
    qr_code TEXT,
    session_data JSONB,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. TABELA WHATSAPP_TEMPLATES
-- ========================================
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

-- ========================================
-- 3. TABELA WHATSAPP_MESSAGE_QUEUE
-- ========================================
CREATE TABLE IF NOT EXISTS whatsapp_message_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    template_type VARCHAR(50),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    instance_token VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_barbershop_id ON whatsapp_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance_token ON whatsapp_sessions(instance_token);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_barbershop_id ON whatsapp_templates(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_template_type ON whatsapp_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON whatsapp_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_barbershop ON whatsapp_message_queue(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created ON whatsapp_message_queue(created_at);

-- ========================================
-- 5. RLS (ROW LEVEL SECURITY)
-- ========================================
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_sessions
CREATE POLICY "Users can manage WhatsApp sessions from their barbershops" ON whatsapp_sessions
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Políticas para whatsapp_templates
CREATE POLICY "Users can manage templates from their barbershops" ON whatsapp_templates
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Políticas para whatsapp_message_queue
CREATE POLICY "Users can manage message queue from their barbershops" ON whatsapp_message_queue
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- 6. FUNÇÃO PARA ENVIO AUTOMÁTICO
-- ========================================
CREATE OR REPLACE FUNCTION send_appointment_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    template_record RECORD;
    whatsapp_session RECORD;
    processed_message TEXT;
    client_record RECORD;
    service_record RECORD;
    staff_record RECORD;
    barbershop_record RECORD;
BEGIN
    -- Só processar se o agendamento foi confirmado (status = 'confirmed')
    IF NEW.status != 'confirmed' OR (OLD IS NOT NULL AND OLD.status = 'confirmed') THEN
        RETURN NEW;
    END IF;

    -- Buscar template ativo de confirmação
    SELECT * INTO template_record
    FROM whatsapp_templates 
    WHERE barbershop_id = NEW.barbershop_id 
    AND template_type = 'appointment_confirmed' 
    AND is_active = true
    LIMIT 1;

    -- Se não tem template ativo, não fazer nada
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Buscar sessão WhatsApp ativa
    SELECT * INTO whatsapp_session
    FROM whatsapp_sessions 
    WHERE barbershop_id = NEW.barbershop_id 
    AND is_connected = true
    LIMIT 1;

    -- Se não tem WhatsApp conectado, não fazer nada
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Buscar dados do cliente
    SELECT * INTO client_record
    FROM clients 
    WHERE id = NEW.client_id;

    -- Buscar dados do serviço
    SELECT * INTO service_record
    FROM services 
    WHERE id = NEW.service_id;

    -- Buscar dados do profissional
    SELECT * INTO staff_record
    FROM staff_members 
    WHERE id = NEW.staff_member_id;

    -- Buscar dados da barbearia
    SELECT * INTO barbershop_record
    FROM barbershops 
    WHERE id = NEW.barbershop_id;

    -- Processar template substituindo variáveis
    processed_message := template_record.message;
    processed_message := REPLACE(processed_message, '{cliente_nome}', COALESCE(client_record.name, NEW.client_name, 'Cliente'));
    processed_message := REPLACE(processed_message, '{data}', TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'));
    processed_message := REPLACE(processed_message, '{horario}', TO_CHAR(NEW.start_time, 'HH24:MI'));
    processed_message := REPLACE(processed_message, '{servico}', COALESCE(service_record.name, NEW.service_name, 'Serviço'));
    processed_message := REPLACE(processed_message, '{profissional}', COALESCE(staff_record.name, NEW.staff_name, 'Profissional'));
    processed_message := REPLACE(processed_message, '{barbearia_nome}', COALESCE(barbershop_record.name, 'Barbearia'));
    processed_message := REPLACE(processed_message, '{barbearia_endereco}', COALESCE(barbershop_record.address, 'Endereço não informado'));

    -- Inserir na fila de mensagens para processamento assíncrono
    INSERT INTO whatsapp_message_queue (
        barbershop_id,
        phone_number,
        message,
        template_type,
        appointment_id,
        instance_token,
        status,
        created_at
    ) VALUES (
        NEW.barbershop_id,
        COALESCE(client_record.phone, NEW.client_phone),
        processed_message,
        'appointment_confirmed',
        NEW.id,
        whatsapp_session.instance_token,
        'pending',
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. TRIGGER PARA ENVIO AUTOMÁTICO
-- ========================================
DROP TRIGGER IF EXISTS appointment_confirmation_trigger ON appointments;
CREATE TRIGGER appointment_confirmation_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION send_appointment_confirmation();

-- ========================================
-- 8. INSERIR TEMPLATES PADRÃO
-- ========================================
-- Esta parte será executada apenas se houver barbearias
INSERT INTO whatsapp_templates (barbershop_id, template_type, name, message, is_active)
SELECT 
    b.id,
    'appointment_confirmed',
    'Agendamento Confirmado',
    '✅ *Agendamento Confirmado!*

Olá {cliente_nome}! 

Seu agendamento foi confirmado com sucesso:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Obrigado por escolher nossos serviços! 
Até breve! 😊',
    true
FROM barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'appointment_confirmed'
);

INSERT INTO whatsapp_templates (barbershop_id, template_type, name, message, is_active)
SELECT 
    b.id,
    'appointment_reminder',
    'Lembrete de Agendamento',
    '⏰ *Lembrete de Agendamento*

Olá {cliente_nome}! 

Lembrando que você tem um agendamento *amanhã*:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.',
    true
FROM barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'appointment_reminder'
);

-- ========================================
-- 9. COMENTÁRIOS
-- ========================================
COMMENT ON TABLE whatsapp_sessions IS 'Sessões WhatsApp para cada barbearia';
COMMENT ON TABLE whatsapp_templates IS 'Templates de mensagens WhatsApp para cada barbearia';
COMMENT ON TABLE whatsapp_message_queue IS 'Fila de mensagens WhatsApp para processamento assíncrono';

COMMENT ON COLUMN whatsapp_templates.template_type IS 'Tipo do template: appointment_confirmed, appointment_reminder';
COMMENT ON COLUMN whatsapp_templates.message IS 'Mensagem do template com variáveis como {cliente_nome}, {data}, etc';
COMMENT ON COLUMN whatsapp_templates.is_active IS 'Se o template está ativo para envio automático';

-- ========================================
-- 10. VERIFICAÇÃO FINAL
-- ========================================
SELECT 
    '✅ SISTEMA WHATSAPP CRIADO COM SUCESSO!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'whatsapp_%') as tabelas_criadas,
    (SELECT COUNT(*) FROM whatsapp_templates) as templates_inseridos;

-- Mostrar estrutura criada
SELECT 
    table_name as tabela,
    COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name LIKE 'whatsapp_%'
GROUP BY table_name
ORDER BY table_name;