-- ==============================================================================
-- POCKETPOS: Phase 4 — Product Management & Category Management
-- ==============================================================================

-- 1. Tighten Product Visibility RLS for Cashiers
-- Cashiers can only view active products. Inactive products are reserved for Owners.
DROP POLICY IF EXISTS "Members can view shop products" ON public.products;
CREATE POLICY "Members can view shop products"
    ON public.products FOR SELECT
    USING (
        shop_id IN (SELECT public.get_auth_shop_ids())
        AND (is_active = TRUE OR public.is_shop_owner(shop_id))
    );

-- 2. Performance Composite Indexes for Fast Search, Filtering & Listing
CREATE INDEX IF NOT EXISTS idx_products_shop_search 
    ON public.products (shop_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_products_shop_stock 
    ON public.products (shop_id, current_stock, minimum_stock);

-- 3. Atomic Stock Adjustment Stored Procedure
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_shop_id UUID,
    p_product_id UUID,
    p_quantity_change NUMERIC,
    p_movement_type TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_product RECORD;
    v_allow_negative BOOLEAN;
    v_new_stock NUMERIC(12,3);
    v_movement_id UUID;
BEGIN
    -- Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Strict Authorization: Only shop owners can adjust stock manually
    IF NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Access denied: Only shop owners can manually adjust inventory';
    END IF;

    -- Validate movement type
    IF p_movement_type NOT IN ('MANUAL_CORRECTION', 'PURCHASE_RECEIPT', 'DAMAGED_EXPIRED', 'RETURN') THEN
        RAISE EXCEPTION 'Invalid adjustment movement type: %', p_movement_type;
    END IF;

    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'Quantity adjustment cannot be zero';
    END IF;

    -- Fetch shop negative stock policy
    SELECT allow_negative_stock INTO v_allow_negative
    FROM public.shops
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shop % not found', p_shop_id;
    END IF;

    -- Row-lock product record to prevent concurrent races
    SELECT id, name, current_stock, is_active
    INTO v_product
    FROM public.products
    WHERE id = p_product_id AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found in shop %', p_product_id, p_shop_id;
    END IF;

    v_new_stock := v_product.current_stock + p_quantity_change;

    -- Guard against negative stock if shop prohibits it
    IF NOT COALESCE(v_allow_negative, FALSE) AND v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock adjustment would result in negative stock (%) for product "%"',
            v_new_stock, v_product.name;
    END IF;

    -- Update product stock
    UPDATE public.products
    SET current_stock = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;

    -- Record immutable audit log in inventory_movements
    INSERT INTO public.inventory_movements (
        shop_id,
        product_id,
        user_id,
        movement_type,
        quantity,
        stock_before,
        stock_after,
        notes
    ) VALUES (
        p_shop_id,
        p_product_id,
        v_caller_id,
        p_movement_type,
        p_quantity_change,
        v_product.current_stock,
        v_new_stock,
        COALESCE(p_notes, 'Manual stock adjustment')
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'product_id', p_product_id,
        'movement_id', v_movement_id,
        'previous_stock', v_product.current_stock,
        'quantity_change', p_quantity_change,
        'new_stock', v_new_stock
    );
END;
$$;

-- 4. Safe Category Deletion Stored Procedure
CREATE OR REPLACE FUNCTION public.delete_category_safe(
    p_shop_id UUID,
    p_category_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_product_count INT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Access denied: Only shop owners can delete categories';
    END IF;

    -- Check if any products are assigned to this category
    SELECT COUNT(*) INTO v_product_count
    FROM public.products
    WHERE category_id = p_category_id AND shop_id = p_shop_id;

    IF v_product_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete category: % products are assigned to it. Please reassign or remove them first.', v_product_count;
    END IF;

    DELETE FROM public.categories
    WHERE id = p_category_id AND shop_id = p_shop_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'deleted_category_id', p_category_id
    );
END;
$$;

-- 5. Helper Function: Get Shop Categories with Product Counts
CREATE OR REPLACE FUNCTION public.get_shop_categories_with_count(p_shop_id UUID)
RETURNS TABLE (
    id UUID,
    shop_id UUID,
    name TEXT,
    description TEXT,
    product_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.shop_id,
        c.name,
        c.description,
        COUNT(p.id) AS product_count,
        c.created_at,
        c.updated_at
    FROM public.categories c
    LEFT JOIN public.products p ON p.category_id = c.id AND p.is_active = TRUE
    WHERE c.shop_id = p_shop_id
      AND c.shop_id IN (SELECT public.get_auth_shop_ids())
    GROUP BY c.id, c.shop_id, c.name, c.description, c.created_at, c.updated_at
    ORDER BY c.name ASC;
$$;
