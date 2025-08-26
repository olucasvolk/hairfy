-- SCRIPT ADAPTATIVO PARA CORRIGIR WHATSAPP
-- Este script se adapta à estrutura existente

-- ========================================
-- 1. VERIFICAR E ADAPTAR ESTRUTURA EXISTENTE
-- ========================================

-- Adicionar coluna 'name' se não existir em whatsapp_templates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        -- Verificar se coluna 'name' existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'whatsapp_templates' 
            AND column_name = 'name'
        ) THEN
            ALTER TABLE whatsapp_templates ADD COLUMN name VARCHAR(255);
            RAISE NOTICE '✅ Coluna name adicionada à whatsapp_templates';
        ELSE
            RAISE NOTICE '📋 Coluna name já existe em whatsapp_templates';
        END IF;
        
        -- Verificar se coluna 'template_type' existe (pode estar como 'type')
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'whatsapp_templates' 
            AND column_name = 'template_type'
        ) THEN
            -- Se existe 'type', renomear para 'template_type'
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'whatsapp_templates' 
                AND column_name = 'type'
            ) THEN
                ALTER TABLE whatsapp_templates RENAME COLUMN type TO template_type;
                RAISE NOTICE '✅ Coluna type renomeada para template_type';
            ELSE
                -- Se não existe nem 'type' nem 'template_type', adicionar
                ALTER TABLE whatsapp_templates ADD COLUMN template_type VARCHAR(50);
                RAISE NOTICE '✅ Coluna template_type adicionada';
            END IF;
        ELSE
            RAISE NOTICE '📋 Coluna template_type já existe';
        END IF;
        
        -- Verificar outras colunas essenciais
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'whatsapp_templates' 
            AND column_name = 'message'
        ) THEN
            -- Se existe 'message_template', renomear
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'whatsapp_templates' 
                AND column_name = 'message_template'
            ) THEN
                ALTER TABLE whatsapp_templates RENAME COLUMN message_template TO message;
                RAISE NOTICE '✅ Coluna message_template renomeada para message';
            ELSE
                ALTER TABLE whatsapp_templates ADD COLUMN message TEXT;
                RAISE NOTICE '✅ Coluna message adicionada';
            END IF;
        END IF;
        
        -- Verificar coluna is_active
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'whatsapp_templates' 
            AND column_name = 'is_active'
        ) THEN
            ALTER TABLE whatsapp_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
            RAISE NOTICE '✅ Coluna is_active adicionada';
        END IF;
    END IF;
END $$;

-- ========================================
-- 2. CRIAR TABELAS QUE NÃO EXISTEM
-- ========================================

-- Tabela whatsapp_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sessions') THEN
        CREATE TABLE whatsapp_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE UNIQUE,
            instance_token TEXT,
            instance_id TEXT,
            phone_number TEXT,
            profile_name TEXT,
            profile_pic_url TEXT,
            is_connected BOOLEAN DEFAULT false,
            status TEXT DEFAULT 'disconnected',
            qr_code TEXT,
            session_data JSONB,
            last_connected_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela whatsapp_sessions criada';
    ELSE
        RAISE NOTICE '📋 Tabela whatsapp_sessions já existe';
    END IF;
END $$;

-- Tabela whatsapp_message_queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_message_queue') THEN
        CREATE TABLE whatsapp_message_queue (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            template_type VARCHAR(50),
            appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
            instance_token VARCHAR(255) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            error_message TEXT,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 3,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            sent_at TIMESTAMP WITH TIME ZONE,
            failed_at TIMESTAMP WITH TIME ZONE
        );
        RAISE NOTICE '✅ Tabela whatsapp_message_queue criada';
    ELSE
        RAISE NOTICE '📋 Tabela whatsapp_message_queue já existe';
    END IF;
END $$;

-- ========================================
-- 3. CRIAR ÍNDICES SEGUROS
-- ========================================

DO $$
BEGIN
    -- Índices para whatsapp_sessions
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_sessions_barbershop_id') THEN
        CREATE INDEX idx_whatsapp_sessions_barbershop_id ON whatsapp_sessions(barbershop_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_sessions_instance_token') THEN
        CREATE INDEX idx_whatsapp_sessions_instance_token ON whatsapp_sessions(instance_token);
    END IF;
    
    -- Índices para whatsapp_templates
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_templates_barbershop_id') THEN
        CREATE INDEX idx_whatsapp_templates_barbershop_id ON whatsapp_templates(barbershop_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_templates_template_type') THEN
        CREATE INDEX idx_whatsapp_templates_template_type ON whatsapp_templates(template_type);
    END IF;
    
    -- Índices para whatsapp_message_queue
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_queue_status') THEN
        CREATE INDEX idx_whatsapp_queue_status ON whatsapp_message_queue(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_queue_barbershop') THEN
        CREATE INDEX idx_whatsapp_queue_barbershop ON whatsapp_message_queue(barbershop_id);
    END IF;
    
    RAISE NOTICE '✅ Índices verificados/criados';
END $$;

-- ========================================
-- 4. HABILITAR RLS E CRIAR POLÍTICAS SEGURAS
-- ========================================

DO $$
BEGIN
    -- Habilitar RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sessions') THEN
        ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_message_queue') THEN
        ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
    END IF;
    
    RAISE NOTICE '✅ RLS habilitado';
END $$;

-- Políticas (com DROP IF EXISTS para evitar erros)
DROP POLICY IF EXISTS "Users can manage WhatsApp sessions from their barbershops" ON whatsapp_sessions;
CREATE POLICY "Users can manage WhatsApp sessions from their barbershops" ON whatsapp_sessions
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage templates from their barbershops" ON whatsapp_templates;
CREATE POLICY "Users can manage templates from their barbershops" ON whatsapp_templates
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage message queue from their barbershops" ON whatsapp_message_queue;
CREATE POLICY "Users can manage message queue from their barbershops" ON whatsapp_message_queue
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- 5. ATUALIZAR DADOS EXISTENTES E INSERIR NOVOS
-- ========================================

-- Atualizar registros existentes que não têm 'name'
UPDATE whatsapp_templates 
SET name = CASE 
    WHEN template_type = 'appointment_confirmed' OR template_type = 'confirmation' THEN 'Agendamento Confirmado'
    WHEN template_type = 'appointment_reminder' OR template_type = 'reminder' THEN 'Lembrete de Agendamento'
    ELSE 'Template WhatsApp'
END
WHERE name IS NULL OR name = '';

-- Normalizar template_type
UPDATE whatsapp_templates 
SET template_type = 'appointment_confirmed' 
WHERE template_type = 'confirmation';

UPDATE whatsapp_templates 
SET template_type = 'appointment_reminder' 
WHERE template_type = 'reminder';

-- Inserir templates padrão apenas se não existirem
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
-- 6. CRIAR FUNÇÃO E TRIGGER
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
    -- Só processar se o agendamento foi confirmado
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

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Buscar sessão WhatsApp ativa
    SELECT * INTO whatsapp_session
    FROM whatsapp_sessions 
    WHERE barbershop_id = NEW.barbershop_id 
    AND is_connected = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Buscar dados relacionados
    SELECT * INTO client_record FROM clients WHERE id = NEW.client_id;
    SELECT * INTO service_record FROM services WHERE id = NEW.service_id;
    SELECT * INTO staff_record FROM staff_members WHERE id = NEW.staff_member_id;
    SELECT * INTO barbershop_record FROM barbershops WHERE id = NEW.barbershop_id;

    -- Processar template
    processed_message := template_record.message;
    processed_message := REPLACE(processed_message, '{cliente_nome}', COALESCE(client_record.name, NEW.client_name, 'Cliente'));
    processed_message := REPLACE(processed_message, '{data}', TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'));
    processed_message := REPLACE(processed_message, '{horario}', TO_CHAR(NEW.start_time, 'HH24:MI'));
    processed_message := REPLACE(processed_message, '{servico}', COALESCE(service_record.name, NEW.service_name, 'Serviço'));
    processed_message := REPLACE(processed_message, '{profissional}', COALESCE(staff_record.name, NEW.staff_name, 'Profissional'));
    processed_message := REPLACE(processed_message, '{barbearia_nome}', COALESCE(barbershop_record.name, 'Barbearia'));
    processed_message := REPLACE(processed_message, '{barbearia_endereco}', COALESCE(barbershop_record.address, 'Endereço não informado'));

    -- Inserir na fila de mensagens
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

-- Recriar trigger
DROP TRIGGER IF EXISTS appointment_confirmation_trigger ON appointments;
CREATE TRIGGER appointment_confirmation_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION send_appointment_confirmation();

-- ========================================
-- 7. VERIFICAÇÃO FINAL
-- ========================================
SELECT 
    '🎯 SISTEMA WHATSAPP ADAPTADO COM SUCESSO!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'whatsapp_%') as tabelas_whatsapp,
    (SELECT COUNT(*) FROM whatsapp_templates) as templates_total;

-- Mostrar estrutura final das templates
SELECT 
    'ESTRUTURA FINAL WHATSAPP_TEMPLATES' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'whatsapp_templates'
ORDER BY ordinal_position;