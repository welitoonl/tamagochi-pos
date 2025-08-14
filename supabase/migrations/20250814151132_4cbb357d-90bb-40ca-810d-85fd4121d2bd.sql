-- Create test users in auth.users first, then profiles, then populate products and sales

-- Insert test users into auth.users (this will trigger the handle_new_user function)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@tamagochii.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin Sistema"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'joao@tamagochii.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"João Gerente"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'maria@tamagochii.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Maria Operadora"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Update the profiles with correct roles (created by trigger with default FUNCIONARIO role)
UPDATE public.profiles SET role = 'ADMIN' WHERE email = 'admin@tamagochii.com';
UPDATE public.profiles SET role = 'GERENTE' WHERE email = 'joao@tamagochii.com';
UPDATE public.profiles SET role = 'FUNCIONARIO' WHERE email = 'maria@tamagochii.com';

-- Continue with products and sales
DO $$
DECLARE
    admin_id uuid;
    gerente_id uuid;
    funcionario_id uuid;
    product_ids uuid[] := ARRAY[]::uuid[];
    sale_id uuid;
    i integer;
BEGIN
    -- Get user IDs from profiles
    SELECT id INTO admin_id FROM public.profiles WHERE email = 'admin@tamagochii.com';
    SELECT id INTO gerente_id FROM public.profiles WHERE email = 'joao@tamagochii.com';
    SELECT id INTO funcionario_id FROM public.profiles WHERE email = 'maria@tamagochii.com';

    -- Insert 10 test products
    WITH product_inserts AS (
        INSERT INTO public.products (name, price, sku, barcode, ean, image, active) VALUES
        ('Coca-Cola 2L', 8.50, 'TGC001001', '7894900011012', '7894900011012', '', true),
        ('Água Mineral 500ml', 2.50, 'TGC001002', '7891000100103', '7891000100103', '', true),
        ('Suco de Laranja 1L', 6.90, 'TGC001003', 'TGC001003', null, '', true),
        ('Pão de Açúcar', 12.90, 'TGC001004', 'TGC001004', null, '', true),
        ('Leite Integral 1L', 5.90, 'TGC001005', '7891000105108', '7891000105108', '', true),
        ('Arroz Branco 5kg', 22.90, 'TGC001006', 'TGC001006', null, '', true),
        ('Feijão Preto 1kg', 8.90, 'TGC001007', 'TGC001007', null, '', true),
        ('Sabonete Dove', 4.50, 'TGC001008', '7891150047310', '7891150047310', '', true),
        ('Pasta de Dente', 7.90, 'TGC001009', 'TGC001009', null, '', true),
        ('Shampoo Pantene', 15.90, 'TGC001010', '7500435126373', '7500435126373', '', true)
        RETURNING id
    )
    SELECT array_agg(id) INTO product_ids FROM product_inserts;

    -- Create initial stock movements for each product
    FOR i IN 1..array_length(product_ids, 1) LOOP
        INSERT INTO public.stock_movements (product_id, type, quantity, created_by, notes) VALUES
        (product_ids[i], 'ENTRADA', 50 + (i * 10), admin_id, 'Estoque inicial');
    END LOOP;

    -- Sale 1: Small purchase - Funcionario
    INSERT INTO public.sales (operator_id, operator_name, total, payment_method, status, created_at) VALUES
    (funcionario_id, 'Maria Operadora', 21.50, 'DINHEIRO', 'FECHADA', now() - interval '2 days')
    RETURNING id INTO sale_id;
    
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    (sale_id, product_ids[1], 'Coca-Cola 2L', 8.50, 2, 17.00),
    (sale_id, product_ids[8], 'Sabonete Dove', 4.50, 1, 4.50);

    -- Sale 2: Medium purchase - Gerente  
    INSERT INTO public.sales (operator_id, operator_name, total, payment_method, status, created_at) VALUES
    (gerente_id, 'João Gerente', 45.70, 'CARTAO', 'FECHADA', now() - interval '1 day 8 hours')
    RETURNING id INTO sale_id;
    
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    (sale_id, product_ids[6], 'Arroz Branco 5kg', 22.90, 1, 22.90),
    (sale_id, product_ids[7], 'Feijão Preto 1kg', 8.90, 1, 8.90),
    (sale_id, product_ids[5], 'Leite Integral 1L', 5.90, 2, 11.80),
    (sale_id, product_ids[2], 'Água Mineral 500ml', 2.50, 1, 2.50);

    -- Sale 3: Large purchase - Admin
    INSERT INTO public.sales (operator_id, operator_name, total, payment_method, status, created_at) VALUES
    (admin_id, 'Admin Sistema', 89.40, 'CARTAO', 'FECHADA', now() - interval '1 day 2 hours')
    RETURNING id INTO sale_id;
    
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    (sale_id, product_ids[1], 'Coca-Cola 2L', 8.50, 3, 25.50),
    (sale_id, product_ids[3], 'Suco de Laranja 1L', 6.90, 2, 13.80),
    (sale_id, product_ids[4], 'Pão de Açúcar', 12.90, 1, 12.90),
    (sale_id, product_ids[9], 'Pasta de Dente', 7.90, 1, 7.90),
    (sale_id, product_ids[10], 'Shampoo Pantene', 15.90, 2, 31.80);

    -- Sale 4: Simple purchase - Funcionario
    INSERT INTO public.sales (operator_id, operator_name, total, payment_method, status, created_at) VALUES
    (funcionario_id, 'Maria Operadora', 18.80, 'DINHEIRO', 'FECHADA', now() - interval '12 hours')
    RETURNING id INTO sale_id;
    
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    (sale_id, product_ids[5], 'Leite Integral 1L', 5.90, 1, 5.90),
    (sale_id, product_ids[4], 'Pão de Açúcar', 12.90, 1, 12.90);

    -- Sale 5: Purchase with cancellation - Gerente
    INSERT INTO public.sales (operator_id, operator_name, total, payment_method, status, created_at, voided_at, voided_by) VALUES
    (gerente_id, 'João Gerente', 35.30, 'CARTAO', 'CANCELADA', now() - interval '6 hours', now() - interval '5 hours', admin_id)
    RETURNING id INTO sale_id;
    
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    (sale_id, product_ids[6], 'Arroz Branco 5kg', 22.90, 1, 22.90),
    (sale_id, product_ids[4], 'Pão de Açúcar', 12.90, 1, 12.90);

END $$;