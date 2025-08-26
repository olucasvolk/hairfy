-- Função para enviar mensagem automática de confirmação de agendamento
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
    IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' THEN
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
    WHERE id = NEW.staff_id;

    -- Buscar dados da barbearia
    SELECT * INTO barbershop_record
    FROM barbershops 
    WHERE id = NEW.barbershop_id;

    -- Processar template substituindo variáveis
    processed_message := template_record.message;
    processed_message := REPLACE(processed_message, '{cliente_nome}', COALESCE(client_record.name, 'Cliente'));
    processed_message := REPLACE(processed_message, '{data}', TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'));
    processed_message := REPLACE(processed_message, '{horario}', TO_CHAR(NEW.appointment_time, 'HH24:MI'));
    processed_message := REPLACE(processed_message, '{servico}', COALESCE(service_record.name, 'Serviço'));
    processed_message := REPLACE(processed_message, '{profissional}', COALESCE(staff_record.name, 'Profissional'));
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
        client_record.phone,
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

-- Criar tabela para fila de mensagens
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_barbershop ON whatsapp_message_queue(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created ON whatsapp_message_queue(created_at);

-- RLS para a fila de mensagens
ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage message queue from their barbershops" ON whatsapp_message_queue
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Criar trigger para envio automático
DROP TRIGGER IF EXISTS appointment_confirmation_trigger ON appointments;
CREATE TRIGGER appointment_confirmation_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION send_appointment_confirmation();

-- Comentários
COMMENT ON TABLE whatsapp_message_queue IS 'Fila de mensagens WhatsApp para processamento assíncrono';
COMMENT ON FUNCTION send_appointment_confirmation() IS 'Função trigger para enviar confirmação automática de agendamentos';