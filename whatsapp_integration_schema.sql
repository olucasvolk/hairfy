-- Schema para integração WhatsApp
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela para armazenar configurações do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL UNIQUE,
    session_data JSONB,
    phone_number TEXT,
    is_connected BOOLEAN DEFAULT false,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    qr_code TEXT,
    status TEXT DEFAULT 'disconnected', -- disconnected, connecting, connected, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela para log de mensagens enviadas
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    message_type TEXT NOT NULL, -- confirmation, reminder, custom
    message_content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela para templates de mensagens
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
    template_type TEXT NOT NULL, -- confirmation, reminder, cancellation
    template_name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(barbershop_id, template_type, template_name)
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_barbershop_id ON public.whatsapp_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_barbershop_id ON public.whatsapp_messages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appointment_id ON public.whatsapp_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_barbershop_id ON public.whatsapp_templates(barbershop_id);

-- 5. Triggers para updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at 
    BEFORE UPDATE ON public.whatsapp_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at 
    BEFORE UPDATE ON public.whatsapp_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS Policies
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage WhatsApp sessions of own barbershops" ON public.whatsapp_sessions
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage WhatsApp messages of own barbershops" ON public.whatsapp_messages
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage WhatsApp templates of own barbershops" ON public.whatsapp_templates
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- 7. Inserir templates padrão
INSERT INTO public.whatsapp_templates (barbershop_id, template_type, template_name, message_template)
SELECT 
    b.id,
    'confirmation',
    'Confirmação de Agendamento',
    'Olá {{client_name}}! 👋

Seu agendamento foi confirmado:

📅 Data: {{appointment_date}}
🕐 Horário: {{appointment_time}}
✂️ Serviço: {{service_name}}
💰 Valor: {{service_price}}

📍 {{barbershop_name}}
{{barbershop_address}}

Qualquer dúvida, entre em contato conosco!'
FROM public.barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'confirmation'
);

INSERT INTO public.whatsapp_templates (barbershop_id, template_type, template_name, message_template)
SELECT 
    b.id,
    'reminder',
    'Lembrete de Agendamento',
    'Oi {{client_name}}! 😊

Lembrando do seu agendamento:

📅 Amanhã - {{appointment_date}}
🕐 {{appointment_time}}
✂️ {{service_name}}

📍 {{barbershop_name}}

Nos vemos lá! 👍'
FROM public.barbershops b
WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates wt 
    WHERE wt.barbershop_id = b.id AND wt.template_type = 'reminder'
);

-- 8. Função para processar templates
CREATE OR REPLACE FUNCTION public.process_whatsapp_template(
    p_template TEXT,
    p_client_name TEXT,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_service_name TEXT,
    p_service_price INTEGER,
    p_barbershop_name TEXT,
    p_barbershop_address TEXT DEFAULT ''
)
RETURNS TEXT AS $$
BEGIN
    RETURN REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(p_template, 
                                '{{client_name}}', p_client_name),
                            '{{appointment_date}}', TO_CHAR(p_appointment_date, 'DD/MM/YYYY')),
                        '{{appointment_time}}', TO_CHAR(p_appointment_time, 'HH24:MI')),
                    '{{service_name}}', p_service_name),
                '{{service_price}}', 'R$ ' || TO_CHAR(p_service_price / 100.0, 'FM999G999D00')),
            '{{barbershop_name}}', p_barbershop_name),
        '{{barbershop_address}}', COALESCE(p_barbershop_address, '')
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Verificar se tudo foi criado
SELECT 'Tabelas WhatsApp criadas:' as status, count(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'whatsapp_%';

SELECT 'Templates inseridos:' as status, count(*) as total
FROM public.whatsapp_templates;