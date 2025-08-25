-- Criar funções para relatórios
-- Execute este script no SQL Editor do Supabase

-- 1. Função para relatório de vendas de produtos
CREATE OR REPLACE FUNCTION public.get_sales_report(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH daily_sales AS (
        SELECT 
            s.sale_date::date as date,
            SUM(s.total_amount) as total
        FROM public.sales s
        WHERE s.barbershop_id = p_barbershop_id
        AND s.sale_date::date BETWEEN p_start_date AND p_end_date
        AND s.include_in_revenue = true
        GROUP BY s.sale_date::date
        ORDER BY date
    ),
    top_products AS (
        SELECT 
            p.name,
            SUM(si.quantity * si.price_at_time_of_sale) as total
        FROM public.sale_items si
        JOIN public.products p ON si.product_id = p.id
        JOIN public.sales s ON si.sale_id = s.id
        WHERE s.barbershop_id = p_barbershop_id
        AND s.sale_date::date BETWEEN p_start_date AND p_end_date
        AND s.include_in_revenue = true
        GROUP BY p.id, p.name
        ORDER BY total DESC
        LIMIT 5
    ),
    totals AS (
        SELECT 
            COALESCE(SUM(s.total_amount), 0) as total_revenue,
            COALESCE(SUM(si.quantity), 0) as total_count
        FROM public.sales s
        LEFT JOIN public.sale_items si ON s.id = si.sale_id
        WHERE s.barbershop_id = p_barbershop_id
        AND s.sale_date::date BETWEEN p_start_date AND p_end_date
        AND s.include_in_revenue = true
    )
    SELECT json_build_object(
        'daily_revenue', COALESCE((SELECT json_agg(json_build_object('date', date, 'total', total)) FROM daily_sales), '[]'::json),
        'top_items', COALESCE((SELECT json_agg(json_build_object('name', name, 'total', total)) FROM top_products), '[]'::json),
        'total_revenue', (SELECT total_revenue FROM totals),
        'total_count', (SELECT total_count FROM totals)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para relatório de serviços
CREATE OR REPLACE FUNCTION public.get_services_report(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH daily_services AS (
        SELECT 
            a.appointment_date as date,
            SUM(a.service_price) as total
        FROM public.appointments a
        WHERE a.barbershop_id = p_barbershop_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
        AND a.status = 'concluido'
        GROUP BY a.appointment_date
        ORDER BY date
    ),
    top_services AS (
        SELECT 
            a.service_name as name,
            SUM(a.service_price) as total
        FROM public.appointments a
        WHERE a.barbershop_id = p_barbershop_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
        AND a.status = 'concluido'
        GROUP BY a.service_name
        ORDER BY total DESC
        LIMIT 5
    ),
    totals AS (
        SELECT 
            COALESCE(SUM(a.service_price), 0) as total_revenue,
            COALESCE(COUNT(*), 0) as total_count
        FROM public.appointments a
        WHERE a.barbershop_id = p_barbershop_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
        AND a.status = 'concluido'
    )
    SELECT json_build_object(
        'daily_revenue', COALESCE((SELECT json_agg(json_build_object('date', date, 'total', total)) FROM daily_services), '[]'::json),
        'top_items', COALESCE((SELECT json_agg(json_build_object('name', name, 'total', total)) FROM top_services), '[]'::json),
        'total_revenue', (SELECT total_revenue FROM totals),
        'total_count', (SELECT total_count FROM totals)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função adicional para relatório geral do dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_barbershop_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH stats AS (
        SELECT 
            -- Agendamentos
            COUNT(CASE WHEN a.appointment_date BETWEEN p_start_date AND p_end_date THEN 1 END) as appointments_count,
            COUNT(CASE WHEN a.appointment_date BETWEEN p_start_date AND p_end_date AND a.status = 'concluido' THEN 1 END) as completed_appointments,
            SUM(CASE WHEN a.appointment_date BETWEEN p_start_date AND p_end_date AND a.status = 'concluido' THEN a.service_price ELSE 0 END) as services_revenue,
            
            -- Vendas
            COUNT(CASE WHEN s.sale_date::date BETWEEN p_start_date AND p_end_date THEN 1 END) as sales_count,
            SUM(CASE WHEN s.sale_date::date BETWEEN p_start_date AND p_end_date AND s.include_in_revenue THEN s.total_amount ELSE 0 END) as products_revenue,
            
            -- Clientes
            COUNT(DISTINCT CASE WHEN a.appointment_date BETWEEN p_start_date AND p_end_date THEN a.client_id END) as active_clients
            
        FROM public.appointments a
        FULL OUTER JOIN public.sales s ON s.barbershop_id = a.barbershop_id
        WHERE COALESCE(a.barbershop_id, s.barbershop_id) = p_barbershop_id
    )
    SELECT json_build_object(
        'appointments_count', COALESCE(appointments_count, 0),
        'completed_appointments', COALESCE(completed_appointments, 0),
        'services_revenue', COALESCE(services_revenue, 0),
        'sales_count', COALESCE(sales_count, 0),
        'products_revenue', COALESCE(products_revenue, 0),
        'total_revenue', COALESCE(services_revenue, 0) + COALESCE(products_revenue, 0),
        'active_clients', COALESCE(active_clients, 0)
    ) INTO result FROM stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verificar se as funções foram criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_sales_report', 'get_services_report', 'get_dashboard_stats')
ORDER BY routine_name;