-- ==============================================================================
-- POCKETPOS: Phase 3 — Database Foundation, RLS Enforcement & Atomic Checkout
-- ==============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categories_shop_name UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_shop ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_shop_name ON public.categories(shop_id, name);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    sku TEXT NULL,
    barcode TEXT NULL,
    brand TEXT NULL,
    description TEXT NULL,
    unit TEXT NOT NULL DEFAULT 'pcs',
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (current_stock >= 0),
    minimum_stock NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (minimum_stock >= 0),
    image_url TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique indexes allowing multiple NULL or empty barcodes/SKUs
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_barcode 
    ON public.products(shop_id, barcode) 
    WHERE barcode IS NOT NULL AND trim(barcode) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_sku 
    ON public.products(shop_id, sku) 
    WHERE sku IS NOT NULL AND trim(sku) <> '';

CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON public.products(shop_id, category_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON public.products(shop_id, is_active);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    phone TEXT NULL,
    email TEXT NULL,
    address TEXT NULL,
    notes TEXT NULL,
    outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (outstanding_balance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_shop_phone 
    ON public.customers(shop_id, phone) 
    WHERE phone IS NOT NULL AND trim(phone) <> '';

CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_active ON public.customers(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_shop_balance ON public.customers(shop_id, outstanding_balance DESC);

-- 4. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('PAID', 'PARTIAL', 'CREDIT')),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'VOIDED', 'REFUNDED')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_shop_invoice UNIQUE (shop_id, invoice_number),
    CONSTRAINT chk_sales_total_math CHECK (ROUND(total, 2) = ROUND(subtotal - discount + tax, 2)),
    CONSTRAINT chk_sales_paid_math CHECK (ROUND(paid_amount + credit_amount, 2) = ROUND(total, 2))
);

CREATE INDEX IF NOT EXISTS idx_sales_shop ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_created ON public.sales(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_shop_customer ON public.sales(shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_cashier ON public.sales(shop_id, cashier_id);

-- 5. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sale_items_line_total CHECK (ROUND(line_total, 2) = ROUND((quantity * unit_price) - discount, 2))
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'UDAAR')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference_number TEXT NULL,
    received_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop ON public.payments(shop_id);

-- 7. CUSTOMER PAYMENTS TABLE (Debt settlement)
CREATE TABLE IF NOT EXISTS public.customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'UDAAR')),
    reference_number TEXT NULL,
    received_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_shop_customer ON public.customer_payments(shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_shop_created ON public.customer_payments(shop_id, created_at DESC);

-- 8. INVENTORY MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    sale_id UUID NULL REFERENCES public.sales(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('SALE', 'PURCHASE_RECEIPT', 'MANUAL_CORRECTION', 'DAMAGED_EXPIRED', 'RETURN')),
    quantity NUMERIC(12,3) NOT NULL,
    stock_before NUMERIC(12,3) NOT NULL CHECK (stock_before >= 0),
    stock_after NUMERIC(12,3) NOT NULL CHECK (stock_after >= 0),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_shop_product ON public.inventory_movements(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_shop_created ON public.inventory_movements(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sale ON public.inventory_movements(sale_id);

-- 9. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('RENT', 'UTILITIES', 'SALARIES', 'TRANSPORT', 'MARKETING', 'MAINTENANCE', 'OTHER') OR char_length(trim(category)) > 0),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    note TEXT NULL,
    logged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop ON public.expenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_created ON public.expenses(shop_id, created_at DESC);

-- 10. INVOICE SEQUENCE TABLE & CONCURRENCY SAFE GENERATOR
CREATE TABLE IF NOT EXISTS public.shop_invoice_sequences (
    shop_id UUID PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
    next_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_seq BIGINT;
    v_date TEXT;
BEGIN
    -- Fetch invoice prefix from shop
    SELECT COALESCE(NULLIF(trim(invoice_prefix), ''), 'INV') INTO v_prefix 
    FROM public.shops 
    WHERE id = p_shop_id;

    IF v_prefix IS NULL THEN
        v_prefix := 'INV';
    END IF;

    -- Concurrency-safe atomic increment with row lock
    INSERT INTO public.shop_invoice_sequences (shop_id, next_number, updated_at)
    VALUES (p_shop_id, 2, NOW())
    ON CONFLICT (shop_id) 
    DO UPDATE SET 
        next_number = public.shop_invoice_sequences.next_number + 1,
        updated_at = NOW()
    RETURNING next_number - 1 INTO v_seq;

    v_date := TO_CHAR(NOW(), 'YYMM');
    RETURN v_prefix || '-' || v_date || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- 11. ROW LEVEL SECURITY ENFORCEMENT ON ALL TABLES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_invoice_sequences ENABLE ROW LEVEL SECURITY;

-- CATEGORIES RLS
DROP POLICY IF EXISTS "Members can view shop categories" ON public.categories;
CREATE POLICY "Members can view shop categories"
    ON public.categories FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
CREATE POLICY "Owners can manage categories"
    ON public.categories FOR ALL
    USING (public.is_shop_owner(shop_id));

-- PRODUCTS RLS
DROP POLICY IF EXISTS "Members can view shop products" ON public.products;
CREATE POLICY "Members can view shop products"
    ON public.products FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Owners can manage products" ON public.products;
CREATE POLICY "Owners can manage products"
    ON public.products FOR ALL
    USING (public.is_shop_owner(shop_id));

-- CUSTOMERS RLS
DROP POLICY IF EXISTS "Members can view shop customers" ON public.customers;
CREATE POLICY "Members can view shop customers"
    ON public.customers FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Members can insert shop customers" ON public.customers;
CREATE POLICY "Members can insert shop customers"
    ON public.customers FOR INSERT
    WITH CHECK (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Members can update shop customers" ON public.customers;
CREATE POLICY "Members can update shop customers"
    ON public.customers FOR UPDATE
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Owners can delete customers" ON public.customers;
CREATE POLICY "Owners can delete customers"
    ON public.customers FOR DELETE
    USING (public.is_shop_owner(shop_id));

-- SALES RLS
DROP POLICY IF EXISTS "Members can view shop sales" ON public.sales;
CREATE POLICY "Members can view shop sales"
    ON public.sales FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Members can insert shop sales" ON public.sales;
CREATE POLICY "Members can insert shop sales"
    ON public.sales FOR INSERT
    WITH CHECK (shop_id IN (SELECT public.get_auth_shop_ids()));

-- SALE ITEMS RLS
DROP POLICY IF EXISTS "Members can view sale items" ON public.sale_items;
CREATE POLICY "Members can view sale items"
    ON public.sale_items FOR SELECT
    USING (sale_id IN (
        SELECT id FROM public.sales WHERE shop_id IN (SELECT public.get_auth_shop_ids())
    ));

-- PAYMENTS RLS
DROP POLICY IF EXISTS "Members can view shop payments" ON public.payments;
CREATE POLICY "Members can view shop payments"
    ON public.payments FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

-- CUSTOMER PAYMENTS RLS
DROP POLICY IF EXISTS "Members can view customer payments" ON public.customer_payments;
CREATE POLICY "Members can view customer payments"
    ON public.customer_payments FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

-- INVENTORY MOVEMENTS RLS
DROP POLICY IF EXISTS "Members can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Members can view inventory movements"
    ON public.inventory_movements FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

-- EXPENSES RLS (Owner only for financials)
DROP POLICY IF EXISTS "Owners can view shop expenses" ON public.expenses;
CREATE POLICY "Owners can view shop expenses"
    ON public.expenses FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Owners can manage expenses" ON public.expenses;
CREATE POLICY "Owners can manage expenses"
    ON public.expenses FOR ALL
    USING (public.is_shop_owner(shop_id));

-- SHOP INVOICE SEQUENCES RLS
DROP POLICY IF EXISTS "Members can view sequences" ON public.shop_invoice_sequences;
CREATE POLICY "Members can view sequences"
    ON public.shop_invoice_sequences FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

-- 12. ATOMIC CHECKOUT TRANSACTION RPC: complete_sale_transaction
CREATE OR REPLACE FUNCTION public.complete_sale_transaction(
    p_shop_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_payments JSONB DEFAULT '[]'::JSONB,
    p_order_discount NUMERIC DEFAULT 0.00,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_tax_rate NUMERIC(5,2);
    v_subtotal NUMERIC(12,2) := 0.00;
    v_items_discount NUMERIC(12,2) := 0.00;
    v_total_discount NUMERIC(12,2) := 0.00;
    v_taxable_amount NUMERIC(12,2) := 0.00;
    v_tax_amount NUMERIC(12,2) := 0.00;
    v_grand_total NUMERIC(12,2) := 0.00;
    v_paid_sum NUMERIC(12,2) := 0.00;
    v_credit_sum NUMERIC(12,2) := 0.00;
    v_payment_status TEXT;
    v_invoice_number TEXT;
    v_sale_id UUID;
    v_item RECORD;
    v_payment RECORD;
    v_product RECORD;
    v_customer RECORD;
    v_line_discount NUMERIC(12,2);
    v_line_total NUMERIC(12,2);
BEGIN
    -- 1. Verify authenticated user
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to process checkout';
    END IF;

    -- 2. Verify shop membership
    IF NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = v_caller_id 
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an active member of shop %', p_shop_id;
    END IF;

    -- 3. Verify items payload is non-empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot checkout with an empty cart';
    END IF;

    -- 4. Fetch shop tax rate
    SELECT COALESCE(tax_rate, 0.00) INTO v_tax_rate
    FROM public.shops
    WHERE id = p_shop_id;

    -- 5. Create temporary structure to hold validated items and avoid multiple lookups
    CREATE TEMPORARY TABLE temp_checkout_items (
        product_id UUID,
        quantity NUMERIC(12,3),
        unit_price NUMERIC(12,2),
        unit_cost NUMERIC(12,2),
        discount NUMERIC(12,2),
        line_total NUMERIC(12,2),
        stock_before NUMERIC(12,3),
        stock_after NUMERIC(12,3)
    ) ON COMMIT DROP;

    -- 6. Process and lock each product with SELECT ... FOR UPDATE
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        quantity NUMERIC,
        discount NUMERIC
    )
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid item quantity: %', v_item.quantity;
        END IF;

        -- Lock product row to prevent race conditions
        SELECT id, shop_id, name, purchase_price, selling_price, current_stock, is_active
        INTO v_product
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in database', v_item.product_id;
        END IF;

        IF v_product.shop_id <> p_shop_id THEN
            RAISE EXCEPTION 'Security error: Product % does not belong to shop %', v_product.name, p_shop_id;
        END IF;

        IF NOT v_product.is_active THEN
            RAISE EXCEPTION 'Product % is currently deactivated and cannot be sold', v_product.name;
        END IF;

        IF (v_product.current_stock - v_item.quantity) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product "%": Available %, Requested %', 
                v_product.name, v_product.current_stock, v_item.quantity;
        END IF;

        v_line_discount := GREATEST(0.00, COALESCE(v_item.discount, 0.00));
        v_line_total := ROUND((v_item.quantity * v_product.selling_price) - v_line_discount, 2);

        IF v_line_total < 0 THEN
            RAISE EXCEPTION 'Line item discount cannot exceed item total for %', v_product.name;
        END IF;

        v_subtotal := v_subtotal + ROUND(v_item.quantity * v_product.selling_price, 2);
        v_items_discount := v_items_discount + v_line_discount;

        -- Update stock immediately within the lock
        UPDATE public.products
        SET current_stock = current_stock - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_product.id;

        INSERT INTO temp_checkout_items (
            product_id, quantity, unit_price, unit_cost, discount, line_total, stock_before, stock_after
        ) VALUES (
            v_product.id, v_item.quantity, v_product.selling_price, v_product.purchase_price,
            v_line_discount, v_line_total, v_product.current_stock, (v_product.current_stock - v_item.quantity)
        );
    END LOOP;

    -- 7. Calculate Order Totals
    v_total_discount := v_items_discount + GREATEST(0.00, COALESCE(p_order_discount, 0.00));
    IF v_total_discount > v_subtotal THEN
        RAISE EXCEPTION 'Total discount (%) cannot exceed subtotal (%)', v_total_discount, v_subtotal;
    END IF;

    v_taxable_amount := ROUND(v_subtotal - v_total_discount, 2);
    v_tax_amount := ROUND((v_taxable_amount * v_tax_rate) / 100.0, 2);
    v_grand_total := ROUND(v_taxable_amount + v_tax_amount, 2);

    -- 8. Validate Payments
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS p(
        payment_method TEXT,
        amount NUMERIC,
        reference_number TEXT
    )
    LOOP
        IF v_payment.amount <= 0 THEN
            RAISE EXCEPTION 'Payment amount must be greater than zero';
        END IF;

        IF v_payment.payment_method NOT IN ('CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'UDAAR') THEN
            RAISE EXCEPTION 'Invalid payment method: %', v_payment.payment_method;
        END IF;

        IF v_payment.payment_method = 'UDAAR' THEN
            v_credit_sum := v_credit_sum + v_payment.amount;
        ELSE
            v_paid_sum := v_paid_sum + v_payment.amount;
        END IF;
    END LOOP;

    -- Verify total payments match grand total
    IF ROUND(v_paid_sum + v_credit_sum, 2) <> v_grand_total THEN
        RAISE EXCEPTION 'Payment mismatch: Paid (%) + Udhaar (%) does not equal Grand Total (%)',
            v_paid_sum, v_credit_sum, v_grand_total;
    END IF;

    -- 9. Handle Customer Udhaar
    IF v_credit_sum > 0 THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'A registered customer is required when using Udhaar / Credit';
        END IF;

        SELECT id, name, outstanding_balance, is_active
        INTO v_customer
        FROM public.customers
        WHERE id = p_customer_id AND shop_id = p_shop_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Customer % not found in this shop', p_customer_id;
        END IF;

        IF NOT v_customer.is_active THEN
            RAISE EXCEPTION 'Customer % is inactive and cannot receive credit', v_customer.name;
        END IF;

        UPDATE public.customers
        SET outstanding_balance = outstanding_balance + v_credit_sum,
            updated_at = NOW()
        WHERE id = p_customer_id;
    END IF;

    -- 10. Determine Payment Status
    IF v_credit_sum = 0.00 THEN
        v_payment_status := 'PAID';
    ELSIF v_paid_sum > 0.00 AND v_credit_sum > 0.00 THEN
        v_payment_status := 'PARTIAL';
    ELSE
        v_payment_status := 'CREDIT';
    END IF;

    -- 11. Generate Sequential Invoice Number
    v_invoice_number := public.generate_invoice_number(p_shop_id);

    -- 12. Insert Sale Record
    INSERT INTO public.sales (
        shop_id, invoice_number, cashier_id, customer_id,
        subtotal, discount, tax, total, paid_amount, credit_amount,
        payment_status, status, notes
    ) VALUES (
        p_shop_id, v_invoice_number, v_caller_id, p_customer_id,
        v_subtotal, v_total_discount, v_tax_amount, v_grand_total,
        v_paid_sum, v_credit_sum, v_payment_status, 'COMPLETED', p_notes
    ) RETURNING id INTO v_sale_id;

    -- 13. Insert Sale Items & Inventory Movements
    FOR v_item IN SELECT * FROM temp_checkout_items LOOP
        INSERT INTO public.sale_items (
            sale_id, product_id, quantity, unit_price, unit_cost, discount, line_total
        ) VALUES (
            v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price,
            v_item.unit_cost, v_item.discount, v_item.line_total
        );

        INSERT INTO public.inventory_movements (
            shop_id, product_id, sale_id, user_id, movement_type,
            quantity, stock_before, stock_after, notes
        ) VALUES (
            p_shop_id, v_item.product_id, v_sale_id, v_caller_id, 'SALE',
            -v_item.quantity, v_item.stock_before, v_item.stock_after,
            'Sale ' || v_invoice_number
        );
    END LOOP;

    -- 14. Insert Payments
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS p(
        payment_method TEXT,
        amount NUMERIC,
        reference_number TEXT
    )
    LOOP
        INSERT INTO public.payments (
            shop_id, sale_id, payment_method, amount, reference_number, received_by
        ) VALUES (
            p_shop_id, v_sale_id, v_payment.payment_method, v_payment.amount,
            v_payment.reference_number, v_caller_id
        );
    END LOOP;

    -- 15. Return atomic confirmation
    RETURN jsonb_build_object(
        'success', TRUE,
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_number,
        'subtotal', v_subtotal,
        'discount', v_total_discount,
        'tax', v_tax_amount,
        'total', v_grand_total,
        'paid_amount', v_paid_sum,
        'credit_amount', v_credit_sum,
        'payment_status', v_payment_status
    );
END;
$$;

-- 13. ATOMIC DEBT SETTLEMENT RPC: record_customer_payment
CREATE OR REPLACE FUNCTION public.record_customer_payment(
    p_shop_id UUID,
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_customer RECORD;
    v_payment_id UUID;
    v_new_balance NUMERIC(12,2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify caller membership
    IF NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = v_caller_id 
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    IF p_payment_method NOT IN ('CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH') THEN
        RAISE EXCEPTION 'Invalid settlement payment method: %', p_payment_method;
    END IF;

    -- Lock customer row
    SELECT id, name, outstanding_balance INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    IF p_amount > v_customer.outstanding_balance THEN
        RAISE EXCEPTION 'Payment amount (%) cannot exceed outstanding debt (%)',
            p_amount, v_customer.outstanding_balance;
    END IF;

    v_new_balance := ROUND(v_customer.outstanding_balance - p_amount, 2);

    -- Insert payment record
    INSERT INTO public.customer_payments (
        shop_id, customer_id, amount, payment_method, reference_number, received_by, notes
    ) VALUES (
        p_shop_id, p_customer_id, p_amount, p_payment_method, p_reference_number, v_caller_id, p_notes
    ) RETURNING id INTO v_payment_id;

    -- Deduct balance
    UPDATE public.customers
    SET outstanding_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment_id,
        'previous_balance', v_customer.outstanding_balance,
        'paid_amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;
