-- Função para enviar lembretes automáticos via WhatsApp
-- Execute este script no SQL Editor do Supabase

-- 1. Função para buscar agendamentos que precisam de lembrete
CREATE OR REPLACE FUNCTION public.get_appointments_for_reminder()
RETURNS TABLE (
    appointment_id UUID,
    barbershop_id UUID,
    client_name TEXT,
    client_phone TEXT,
    appointment_date DATE,
    start_time TIME,
    service_name TEXT,
    barbershop_name TEXT,
    is_whatsapp_connected BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as appointment_id,
        a.barbershop_id,
        a.client_name,
        a.client_phone,
        a.appointment_date,
        a.start_time,
        a.service_name,
        b.name as barbershop_name,
        COALESCE(ws.is_connected, false) as is_whatsapp_connected
    FROM public.appointments a
    JOIN public.barbershops b ON a.barbershop_id = b.id
    LEFT JOIN public.whatsapp_sessions ws ON a.barbershop_id = ws.barbershop_id
    WHERE 
        -- Agendamentos para amanhã
        a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
        -- Apenas agendamentos confirmados ou agendados
        AND a.status IN ('agendado', 'confirmado')
        -- Apenas se o WhatsApp estiver conectado
        AND COALESCE(ws.is_connected, false) = true
        -- Não enviar lembrete se já foi enviado hoje
        AND NOT EXISTS (
            SELECT 1 FROM public.whatsapp_messages wm
            WHERE wm.appointment_id = a.id
            AND wm.message_type = 'reminder'
            AND wm.sent_at::date = CURRENT_DATE
            AND wm.status IN ('sent', 'delivered')
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para marcar agendamento como lembrete enviado
CREATE OR REPLACE FUNCTION public.mark_reminder_sent(
    p_appointment_id UUID,
    p_barbershop_id UUID,
    p_client_phone TEXT,
    p_client_name TEXT,
    p_message_content TEXT
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
BEGIN
    INSERT INTO public.whatsapp_messages (
        barbershop_id,
        appointment_id,
        client_phone,
        client_name,
        message_type,
        message_content,
        status
    ) VALUES (
        p_barbershop_id,
        p_appointment_id,
        p_client_phone,
        p_client_name,
        'reminder',
        p_message_content,
        'sent'
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para atualizar status de lembrete no agendamento
CREATE OR REPLACE FUNCTION public.update_appointment_reminder_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma mensagem de lembrete é enviada, marcar no agendamento
    IF NEW.message_type = 'reminder' AND NEW.status = 'sent' THEN
        UPDATE public.appointments
        SET reminder_sent = true
        WHERE id = NEW.appointment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para atualizar status de lembrete
DROP TRIGGER IF EXISTS update_reminder_status_trigger ON public.whatsapp_messages;
CREATE TRIGGER update_reminder_status_trigger
    AFTER INSERT OR UPDATE ON public.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_appointment_reminder_status();

-- 5. Verificar se as funções foram criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_appointments_for_reminder', 'mark_reminder_sent', 'update_appointment_reminder_status')
ORDER BY routine_name;