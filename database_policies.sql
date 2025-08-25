-- BarberFlow SaaS - Row Level Security Policies
-- Execute este script após criar as tabelas

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Barbershops policies
CREATE POLICY "Users can view own barbershops" ON public.barbershops
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own barbershops" ON public.barbershops
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own barbershops" ON public.barbershops
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own barbershops" ON public.barbershops
    FOR DELETE USING (auth.uid() = owner_id);

-- Services policies
CREATE POLICY "Users can manage services of own barbershops" ON public.services
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Staff members policies
CREATE POLICY "Users can manage staff of own barbershops" ON public.staff_members
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Clients policies
CREATE POLICY "Users can manage clients of own barbershops" ON public.clients
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Products policies
CREATE POLICY "Users can manage products of own barbershops" ON public.products
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Appointments policies
CREATE POLICY "Users can manage appointments of own barbershops" ON public.appointments
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Sales policies
CREATE POLICY "Users can manage sales of own barbershops" ON public.sales
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Sale items policies
CREATE POLICY "Users can manage sale items of own barbershops" ON public.sale_items
    FOR ALL USING (
        sale_id IN (
            SELECT s.id FROM public.sales s
            JOIN public.barbershops b ON s.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Appointment products policies
CREATE POLICY "Users can manage appointment products of own barbershops" ON public.appointment_products
    FOR ALL USING (
        appointment_id IN (
            SELECT a.id FROM public.appointments a
            JOIN public.barbershops b ON a.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Subscription plans policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);