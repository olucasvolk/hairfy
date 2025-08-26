-- SCRIPT SEGURO PARA CORRIGIR SISTEMA WHATSAPP
-- Este script verifica o que existe e só cria o que está faltando

-- ========================================
-- 1. VERIFICAR E CRIAR TABELAS APENAS SE NÃO EXISTIREM
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

-- Tabela whatsapp_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        CREATE TABLE whatsapp_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
            template_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(barbershop_id, template_type)
        );
        RAISE NOTICE '✅ Tabela whatsapp_templates criada';
    ELSE
        RAISE NOTICE '📋 Tabela whatsapp_templates já existe';
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
-- 2. CRIAR ÍNDICES APENAS SE NÃO EXISTIREM
-- ========================================

-- Índices para whatsapp_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_sessions_barbershop_id') THEN
        CREATE INDEX idx_whatsapp_sessions_barbershop_id ON whatsapp_sessions(barbershop_id);
        RAISE NOTICE '✅ Índice idx_whatsapp_sessions_barbershop_id criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_sessions_instance_token') THEN
        CREATE INDEX idx_whatsapp_sessions_instance_token ON whatsapp_sessions(instance_token);
        RAISE NOTICE '✅ Índice idx_whatsapp_sessions_instance_token criado';
    END IF;
END $$;

-- Índices para whatsapp_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_templates_barbershop_id') THEN
        CREATE INDEX idx_whatsapp_templates_barbershop_id ON whatsapp_templates(barbershop_id);
        RAISE NOTICE '✅ Índice idx_whatsapp_templates_barbershop_id criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_templates_template_type') THEN
        CREATE INDEX idx_whatsapp_templates_template_type ON whatsapp_templates(template_type);
        RAISE NOTICE '✅ Índice idx_whatsapp_templates_template_type criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_templates_active') THEN
        CREATE INDEX idx_whatsapp_templates_active ON whatsapp_templates(is_active);
        RAISE NOTICE '✅ Índice idx_whatsapp_templates_active criado';
    END IF;
END $$;

-- Índices para whatsapp_message_queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_queue_status') THEN
        CREATE INDEX idx_whatsapp_queue_status ON whatsapp_message_queue(status);
        RAISE NOTICE '✅ Índice idx_whatsapp_queue_status criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_queue_barbershop') THEN
        CREATE INDEX idx_whatsapp_queue_barbershop ON whatsapp_message_queue(barbershop_id);
        RAISE NOTICE '✅ Índice idx_whatsapp_queue_barbershop criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_queue_created') THEN
        CREATE INDEX idx_whatsapp_queue_created ON whatsapp_message_queue(created_at);
        RAISE NOTICE '✅ Índice idx_whatsapp_queue_created criado';
    END IF;
END $$;

-- ========================================
-- 3. HABILITAR RLS APENAS SE NÃO ESTIVER HABILITADO
-- ========================================

DO $$
BEGIN
    -- whatsapp_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sessions') THEN
        ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado para whatsapp_sessions';
    END IF;
    
    -- whatsapp_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
        ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado para whatsapp_templates';
    END IF;
    
    -- whatsapp_message_queue
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_message_queue') THEN
        ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado para whatsapp_message_queue';
    END IF;
END $$;

-- ========================================
-- 4. CRIAR POLÍTICAS APENAS SE NÃO EXISTIREM
-- ========================================

-- Políticas para whatsapp_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_sessions' AND policyname = 'Users can manage WhatsApp sessions from their barbershops') THEN
        CREATE POLICY "Users can manage WhatsApp sessions from their barbershops" ON whatsapp_sessions
            FOR ALL USING (
                barbershop_id IN (
                    SELECT id FROM barbershops 
                    WHERE owner_id = auth.uid()
                )
            );
        RAISE NOTICE '✅ Política criada para whatsapp_sessions';
    ELSE
        RAISE NOTICE '📋 Política já existe para whatsapp_sessions';
    END IF;
END $$;

-- Políticas para whatsapp_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_templates' AND policyname = 'Users can manage templates from their barbershops') THEN
        CREATE POLICY "Users can manage templates from their barbershops" ON whatsapp_templates
            FOR ALL USING (
                barbershop_id IN (
                    SELECT id FROM barbershops 
                    WHERE owner_id = auth.uid()
                )
            );
        RAISE NOTICE '✅ Política criada para whatsapp_templates';
    ELSE
        RAISE NOTICE '📋 Política já existe para whatsapp_templates';
    END IF;
END $$;

-- Políticas para whatsapp_message_queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_message_queue' AND policyname = 'Users can manage message queue from their barbershops') THEN
        CREATE POLICY "Users can manage message queue from their barbershops" ON whatsapp_message_queue
            FOR ALL USING (
                barbershop_id IN (
                    SELECT id FROM barbershops 
                    WHERE owner_id = auth.uid()
                )
            );
        RAISE NOTICE '✅ Política criada para whatsapp_message_queue';
    ELSE
        RAISE NOTICE '📋 Política já existe para whatsapp_message_queue';
    END IF;
END $$;

-- ========================================
-- 5. CRIAR/RECRIAR FUNÇÃO E TRIGGER
-- ========================================

-- Função para envio automático (sempre recriar para garantir que está atualizada)
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

-- Notificação sobre função e trigger
DO $$
BEGIN
    RAISE NOTICE '✅ Função e trigger criados/atualizados';
END $$;

-- ========================================
-- 6. INSERIR TEMPLATES PADRÃO (APENAS SE NÃO EXISTIREM)
-- ========================================

-- Template de confirmação
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

-- Template de lembrete
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
-- 7. VERIFICAÇÃO FINAL
-- ========================================
SELECT 
    '🎯 SISTEMA WHATSAPP CONFIGURADO COM SUCESSO!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'whatsapp_%') as tabelas_whatsapp,
    (SELECT COUNT(*) FROM whatsapp_templates) as templates_total,
    (SELECT COUNT(*) FROM barbershops) as barbershops_total;

-- Mostrar estrutura final
SELECT 
    table_name as tabela,
    COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name LIKE 'whatsapp_%'
GROUP BY table_name
ORDER BY table_name;