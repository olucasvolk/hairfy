-- BarberFlow SaaS - Initial Data
-- Execute este script após criar todas as tabelas, políticas e funções

-- Insert subscription plans
INSERT INTO public.subscription_plans (name, plan_type, price_monthly, price_yearly, max_staff, features) VALUES
(
    'Plano Básico',
    'basico',
    2990, -- R$ 29,90
    29900, -- R$ 299,00 (10 meses)
    2,
    ARRAY[
        'Até 2 profissionais',
        'Agendamento online',
        'Gestão de clientes',
        'Relatórios básicos',
        'Suporte por email'
    ]
),
(
    'Plano Profissional',
    'profissional',
    4990, -- R$ 49,90
    49900, -- R$ 499,00 (10 meses)
    10,
    ARRAY[
        'Até 10 profissionais',
        'Agendamento online',
        'Gestão de clientes',
        'Gestão de produtos e estoque',
        'Controle de vendas',
        'Relatórios avançados',
        'Integração WhatsApp',
        'Suporte prioritário'
    ]
),
(
    'Plano Premium',
    'premium',
    9990, -- R$ 99,90
    99900, -- R$ 999,00 (10 meses)
    NULL, -- Unlimited
    ARRAY[
        'Profissionais ilimitados',
        'Agendamento online',
        'Gestão completa de clientes',
        'Gestão de produtos e estoque',
        'Controle de vendas',
        'Relatórios completos e personalizados',
        'Integração WhatsApp',
        'Sistema de fidelidade',
        'API personalizada',
        'Suporte 24/7',
        'Treinamento personalizado'
    ]
);

-- You can add sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
-- Sample barbershop (you'll need to replace the owner_id with a real user ID)
INSERT INTO public.barbershops (owner_id, name, description, phone, email, address, city, state) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real user ID
    'Barbearia Exemplo',
    'A melhor barbearia da cidade',
    '(11) 99999-9999',
    'contato@barbeariaexemplo.com',
    'Rua das Flores, 123',
    'São Paulo',
    'SP'
);

-- Sample services (you'll need to replace barbershop_id with real ID)
INSERT INTO public.services (barbershop_id, name, description, duration_minutes, price) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'Corte Masculino',
    'Corte tradicional masculino',
    30,
    2500 -- R$ 25,00
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'Barba',
    'Aparar e modelar barba',
    20,
    1500 -- R$ 15,00
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'Corte + Barba',
    'Pacote completo',
    45,
    3500 -- R$ 35,00
);

-- Sample staff member
INSERT INTO public.staff_members (barbershop_id, name, email, phone, commission_percentage) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'João Silva',
    'joao@barbeariaexemplo.com',
    '(11) 88888-8888',
    30.00
);

-- Sample products
INSERT INTO public.products (barbershop_id, name, description, price, stock_quantity) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'Pomada Modeladora',
    'Pomada para modelar cabelo',
    1200, -- R$ 12,00
    50
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with real barbershop ID
    'Óleo para Barba',
    'Óleo hidratante para barba',
    1800, -- R$ 18,00
    30
);
*/