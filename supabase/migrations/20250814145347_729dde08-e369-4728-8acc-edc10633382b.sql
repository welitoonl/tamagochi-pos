-- Fix security issues identified by the linter

-- Update functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
        NEW.email,
        'FUNCIONARIO'
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    timestamp_part TEXT;
BEGIN
    timestamp_part := EXTRACT(EPOCH FROM now())::BIGINT::TEXT;
    RETURN 'TGC' || RIGHT(timestamp_part, 6);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_sale_stock_movement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'FECHADA' AND (OLD.status IS NULL OR OLD.status != 'FECHADA') THEN
        -- Create stock movements for each sale item
        INSERT INTO public.stock_movements (product_id, type, quantity, reference_id, created_by)
        SELECT 
            product_id,
            'VENDA',
            -quantity, -- Negative quantity for sale
            NEW.id,
            NEW.operator_id
        FROM public.sale_items
        WHERE sale_id = NEW.id;
    END IF;
    
    IF NEW.status = 'CANCELADA' AND OLD.status = 'FECHADA' THEN
        -- Reverse stock movements for cancelled sale
        INSERT INTO public.stock_movements (product_id, type, quantity, reference_id, created_by, notes)
        SELECT 
            product_id,
            'CANCELAMENTO',
            quantity, -- Positive quantity to restore stock
            NEW.id,
            NEW.voided_by,
            'Cancelamento de venda'
        FROM public.sale_items
        WHERE sale_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing views (they were created with SECURITY DEFINER by default)
DROP VIEW IF EXISTS public.current_stock;
DROP VIEW IF EXISTS public.daily_sales;
DROP VIEW IF EXISTS public.sales_by_operator;

-- Recreate views without SECURITY DEFINER (regular views)
CREATE VIEW public.current_stock AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.price,
    COALESCE(SUM(sm.quantity), 0) AS current_stock
FROM public.products p
LEFT JOIN public.stock_movements sm ON p.id = sm.product_id
WHERE p.active = true
GROUP BY p.id, p.name, p.sku, p.price;

CREATE VIEW public.daily_sales AS
SELECT 
    DATE(s.created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(s.total) as total_amount,
    s.operator_id,
    s.operator_name
FROM public.sales s
WHERE s.status = 'FECHADA'
GROUP BY DATE(s.created_at), s.operator_id, s.operator_name
ORDER BY sale_date DESC;

CREATE VIEW public.sales_by_operator AS
SELECT 
    s.operator_id,
    s.operator_name,
    COUNT(*) as sales_count,
    SUM(s.total) as total_amount,
    DATE(s.created_at) as sale_date
FROM public.sales s
WHERE s.status = 'FECHADA'
GROUP BY s.operator_id, s.operator_name, DATE(s.created_at)
ORDER BY sale_date DESC, total_amount DESC;