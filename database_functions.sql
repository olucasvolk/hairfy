-- BarberFlow SaaS - Database Functions and Triggers
-- Execute este script após criar as tabelas e políticas

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user into public.users table
    INSERT INTO public.users (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email
    );

    -- Create barbershop if barbershop_name is provided
    IF NEW.raw_user_meta_data->>'barbershop_name' IS NOT NULL THEN
        INSERT INTO public.barbershops (owner_id, name)
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'barbershop_name'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update client stats after appointment
CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update client's last visit and total visits when appointment is completed
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        UPDATE public.clients
        SET 
            last_visit = NEW.appointment_date::timestamp,
            total_visits = total_visits + 1,
            loyalty_points = loyalty_points + FLOOR(NEW.service_price / 100) -- 1 point per R$1
        WHERE id = NEW.client_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating client stats
DROP TRIGGER IF EXISTS update_client_stats_trigger ON public.appointments;
CREATE TRIGGER update_client_stats_trigger
    AFTER UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_client_stats();

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease product stock when sale item is created
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;

    -- Restore product stock when sale item is deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;

    -- Handle quantity changes
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for product stock management
DROP TRIGGER IF EXISTS update_stock_on_sale_insert ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_insert
    AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

DROP TRIGGER IF EXISTS update_stock_on_sale_delete ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_delete
    AFTER DELETE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

DROP TRIGGER IF EXISTS update_stock_on_sale_update ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_update
    AFTER UPDATE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- Function to update product stock for appointment products
CREATE OR REPLACE FUNCTION public.update_product_stock_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease product stock when appointment product is created
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;

    -- Restore product stock when appointment product is deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;

    -- Handle quantity changes
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for appointment product stock management
DROP TRIGGER IF EXISTS update_stock_on_appointment_product_insert ON public.appointment_products;
CREATE TRIGGER update_stock_on_appointment_product_insert
    AFTER INSERT ON public.appointment_products
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_appointment();

DROP TRIGGER IF EXISTS update_stock_on_appointment_product_delete ON public.appointment_products;
CREATE TRIGGER update_stock_on_appointment_product_delete
    AFTER DELETE ON public.appointment_products
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_appointment();

DROP TRIGGER IF EXISTS update_stock_on_appointment_product_update ON public.appointment_products;
CREATE TRIGGER update_stock_on_appointment_product_update
    AFTER UPDATE ON public.appointment_products
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_appointment();

-- Function to calculate sale total
CREATE OR REPLACE FUNCTION public.calculate_sale_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sale total when sale items change
    UPDATE public.sales
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * price_at_time_of_sale), 0)
        FROM public.sale_items
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    )
    WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for sale total calculation
DROP TRIGGER IF EXISTS calculate_sale_total_on_insert ON public.sale_items;
CREATE TRIGGER calculate_sale_total_on_insert
    AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_sale_total();

DROP TRIGGER IF EXISTS calculate_sale_total_on_update ON public.sale_items;
CREATE TRIGGER calculate_sale_total_on_update
    AFTER UPDATE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_sale_total();

DROP TRIGGER IF EXISTS calculate_sale_total_on_delete ON public.sale_items;
CREATE TRIGGER calculate_sale_total_on_delete
    AFTER DELETE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_sale_total();