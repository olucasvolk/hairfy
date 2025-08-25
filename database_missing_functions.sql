-- BarberFlow SaaS - Funções que estão faltando
-- Execute este script no SQL Editor do Supabase

-- 1. Função para buscar ou criar cliente
CREATE OR REPLACE FUNCTION public.get_or_create_client_id(
    p_barbershop_id UUID,
    p_client_email TEXT DEFAULT NULL,
    p_client_name TEXT DEFAULT NULL,
    p_client_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    client_id UUID;
BEGIN
    -- Primeiro, tentar encontrar cliente existente por email ou telefone
    IF p_client_email IS NOT NULL AND p_client_email != '' THEN
        SELECT id INTO client_id
        FROM public.clients
        WHERE barbershop_id = p_barbershop_id 
        AND email = p_client_email
        LIMIT 1;
    END IF;
    
    -- Se não encontrou por email, tentar por telefone
    IF client_id IS NULL AND p_client_phone IS NOT NULL AND p_client_phone != '' THEN
        SELECT id INTO client_id
        FROM public.clients
        WHERE barbershop_id = p_barbershop_id 
        AND phone = p_client_phone
        LIMIT 1;
    END IF;
    
    -- Se não encontrou cliente existente, criar um novo
    IF client_id IS NULL THEN
        INSERT INTO public.clients (
            barbershop_id,
            name,
            email,
            phone,
            is_active
        ) VALUES (
            p_barbershop_id,
            COALESCE(p_client_name, 'Cliente'),
            NULLIF(p_client_email, ''),
            COALESCE(p_client_phone, ''),
            true
        ) RETURNING id INTO client_id;
    END IF;
    
    RETURN client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para atualizar estatísticas do agendamento
CREATE OR REPLACE FUNCTION public.update_appointment_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular total de produtos para o agendamento
    UPDATE public.appointments
    SET products_total = (
        SELECT COALESCE(SUM(ap.quantity * ap.price_at_time_of_sale), 0)
        FROM public.appointment_products ap
        WHERE ap.appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
    )
    WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para atualizar totais de agendamento
DROP TRIGGER IF EXISTS update_appointment_totals_trigger ON public.appointment_products;
CREATE TRIGGER update_appointment_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointment_products
    FOR EACH ROW EXECUTE FUNCTION public.update_appointment_totals();

-- 4. Função para validar dados de agendamento
CREATE OR REPLACE FUNCTION public.validate_appointment_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se o horário não conflita com outros agendamentos
    IF EXISTS (
        SELECT 1 FROM public.appointments
        WHERE barbershop_id = NEW.barbershop_id
        AND appointment_date = NEW.appointment_date
        AND staff_member_id = NEW.staff_member_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND status NOT IN ('cancelado', 'nao_compareceu')
        AND (
            (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
            (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
            (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Conflito de horário: já existe um agendamento neste horário para este profissional.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para validar agendamentos
DROP TRIGGER IF EXISTS validate_appointment_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_trigger
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_data();

-- 6. Verificar se as funções foram criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_or_create_client_id', 'update_appointment_totals', 'validate_appointment_data')
ORDER BY routine_name;