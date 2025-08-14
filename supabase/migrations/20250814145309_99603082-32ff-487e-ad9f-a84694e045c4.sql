-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'GERENTE', 'FUNCIONARIO');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('DINHEIRO', 'CARTAO');

-- Create sale status enum
CREATE TYPE public.sale_status AS ENUM ('PENDENTE', 'FECHADA', 'CANCELADA');

-- Create stock movement type enum
CREATE TYPE public.stock_movement_type AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'CANCELAMENTO');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'FUNCIONARIO',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    image TEXT,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL,
    ean TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock movements table
CREATE TABLE public.stock_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_id UUID, -- Reference to sale_id or other operations
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_method payment_method NOT NULL,
    status sale_status NOT NULL DEFAULT 'PENDENTE',
    operator_id UUID NOT NULL REFERENCES auth.users(id),
    operator_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES auth.users(id)
);

-- Create sale items table
CREATE TABLE public.sale_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role (Security Definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TEXT AS $$
DECLARE
    timestamp_part TEXT;
BEGIN
    timestamp_part := EXTRACT(EPOCH FROM now())::BIGINT::TEXT;
    RETURN 'TGC' || RIGHT(timestamp_part, 6);
END;
$$ LANGUAGE plpgsql;

-- Create function to handle stock movements after sale
CREATE OR REPLACE FUNCTION public.handle_sale_stock_movement()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER handle_sale_stock_trigger
    AFTER UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sale_stock_movement();

-- Create RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
    ON public.profiles FOR SELECT 
    USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can update all profiles" 
    ON public.profiles FOR UPDATE 
    USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Create RLS Policies for products
CREATE POLICY "All authenticated users can view active products" 
    ON public.products FOR SELECT 
    USING (active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can view all products" 
    ON public.products FOR SELECT 
    USING (public.get_current_user_role() IN ('ADMIN', 'GERENTE'));

CREATE POLICY "Managers and admins can manage products" 
    ON public.products FOR ALL 
    USING (public.get_current_user_role() IN ('ADMIN', 'GERENTE'));

-- Create RLS Policies for stock_movements
CREATE POLICY "All authenticated users can view stock movements" 
    ON public.stock_movements FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create stock movements" 
    ON public.stock_movements FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- Create RLS Policies for sales
CREATE POLICY "Users can view their own sales" 
    ON public.sales FOR SELECT 
    USING (operator_id = auth.uid());

CREATE POLICY "Managers and admins can view all sales" 
    ON public.sales FOR SELECT 
    USING (public.get_current_user_role() IN ('ADMIN', 'GERENTE'));

CREATE POLICY "All authenticated users can create sales" 
    ON public.sales FOR INSERT 
    WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Users can update their own sales" 
    ON public.sales FOR UPDATE 
    USING (operator_id = auth.uid());

CREATE POLICY "Managers and admins can update all sales" 
    ON public.sales FOR UPDATE 
    USING (public.get_current_user_role() IN ('ADMIN', 'GERENTE'));

-- Create RLS Policies for sale_items
CREATE POLICY "Users can view items from their own sales" 
    ON public.sale_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.sales 
        WHERE id = sale_id AND operator_id = auth.uid()
    ));

CREATE POLICY "Managers and admins can view all sale items" 
    ON public.sale_items FOR SELECT 
    USING (public.get_current_user_role() IN ('ADMIN', 'GERENTE'));

CREATE POLICY "All authenticated users can create sale items" 
    ON public.sale_items FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sales 
        WHERE id = sale_id AND operator_id = auth.uid()
    ));

-- Create view for current stock
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

-- Create view for daily sales
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

-- Create view for sales by operator
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

-- Create indexes for performance
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_active ON public.products(active);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_sales_operator_id ON public.sales(operator_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);

-- Insert default admin user data (will be created when first user signs up)
-- Note: The actual user will be created in auth.users by Supabase Auth