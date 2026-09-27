-- ==============================================================================
-- POCKETPOS: Phase 4 — Database-Level Purchase Price Security & Column Protection
-- ==============================================================================

-- 1. Database-Level Column Revocation on public.products
-- Revoke direct SELECT access to purchase_price on the table for all client roles.
REVOKE SELECT (purchase_price) ON public.products FROM authenticated, anon;

-- Ensure all non-sensitive columns on public.products are explicitly granted
GRANT SELECT (
    id,
    shop_id,
    category_id,
    name,
    sku,
    barcode,
    brand,
    description,
    unit,
    selling_price,
    current_stock,
    minimum_stock,
    image_url,
    is_active,
    created_at,
    updated_at
) ON public.products TO authenticated, anon;

-- 2. Database-Level Column Revocation on public.sale_items
-- Revoke direct SELECT access to unit_cost on the table for client roles.
REVOKE SELECT (unit_cost) ON public.sale_items FROM authenticated, anon;

GRANT SELECT (
    id,
    sale_id,
    product_id,
    quantity,
    unit_price,
    discount,
    line_total,
    created_at
) ON public.sale_items TO authenticated, anon;

-- 3. Secure Stored Procedure: Fetch Products with Conditional Purchase Price
CREATE OR REPLACE FUNCTION public.get_shop_products(
    p_shop_id UUID,
    p_search TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_stock_filter TEXT DEFAULT 'ALL',
    p_active_filter TEXT DEFAULT 'ALL',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    shop_id UUID,
    category_id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    brand TEXT,
    description TEXT,
    unit TEXT,
    purchase_price NUMERIC(12,2),
    selling_price NUMERIC(12,2),
    current_stock NUMERIC(12,3),
    minimum_stock NUMERIC(12,3),
    image_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Strict multi-tenant check: Caller must be an active member of this shop
    IF NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = v_caller_id 
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an active member of shop %', p_shop_id;
    END IF;

    v_is_owner := public.is_shop_owner(p_shop_id);

    RETURN QUERY
    SELECT 
        p.id,
        p.shop_id,
        p.category_id,
        p.name,
        p.sku,
        p.barcode,
        p.brand,
        p.description,
        p.unit,
        -- DATABASE-LEVEL SECURITY:
        -- Only confirmed OWNER can see the real purchase_price.
        -- Cashiers receive exactly 0.00 from the PostgreSQL query engine.
        CASE 
            WHEN v_is_owner THEN p.purchase_price 
            ELSE 0.00::NUMERIC(12,2) 
        END AS purchase_price,
        p.selling_price,
        p.current_stock,
        p.minimum_stock,
        p.image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        c.name AS category_name
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.shop_id = p_shop_id
      -- Cashiers can ONLY view active products
      AND (p.is_active = TRUE OR v_is_owner = TRUE)
      -- Category filter
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      -- Active filter (only applicable for owners)
      AND (
          p_active_filter = 'ALL' 
          OR (p_active_filter = 'ACTIVE' AND p.is_active = TRUE)
          OR (p_active_filter = 'INACTIVE' AND p.is_active = FALSE)
      )
      -- Stock filter
      AND (
          p_stock_filter = 'ALL'
          OR (p_stock_filter = 'IN_STOCK' AND p.current_stock > 0)
          OR (p_stock_filter = 'LOW_STOCK' AND p.current_stock > 0 AND p.current_stock <= p.minimum_stock)
          OR (p_stock_filter = 'OUT_OF_STOCK' AND p.current_stock <= 0)
      )
      -- Search query
      AND (
          p_search IS NULL 
          OR trim(p_search) = ''
          OR p.name ILIKE '%' || trim(p_search) || '%'
          OR p.sku ILIKE '%' || trim(p_search) || '%'
          OR p.barcode ILIKE '%' || trim(p_search) || '%'
      )
    ORDER BY p.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 4. Secure Stored Procedure: Fetch Single Product by ID
CREATE OR REPLACE FUNCTION public.get_product_by_id(
    p_shop_id UUID,
    p_product_id UUID
)
RETURNS TABLE (
    id UUID,
    shop_id UUID,
    category_id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    brand TEXT,
    description TEXT,
    unit TEXT,
    purchase_price NUMERIC(12,2),
    selling_price NUMERIC(12,2),
    current_stock NUMERIC(12,3),
    minimum_stock NUMERIC(12,3),
    image_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Strict multi-tenant verification
    IF NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = v_caller_id 
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an active member of shop %', p_shop_id;
    END IF;

    v_is_owner := public.is_shop_owner(p_shop_id);

    RETURN QUERY
    SELECT 
        p.id,
        p.shop_id,
        p.category_id,
        p.name,
        p.sku,
        p.barcode,
        p.brand,
        p.description,
        p.unit,
        CASE 
            WHEN v_is_owner THEN p.purchase_price 
            ELSE 0.00::NUMERIC(12,2) 
        END AS purchase_price,
        p.selling_price,
        p.current_stock,
        p.minimum_stock,
        p.image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        c.name AS category_name
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.id = p_product_id 
      AND p.shop_id = p_shop_id
      AND (p.is_active = TRUE OR v_is_owner = TRUE);
END;
$$;

-- 5. Secure Stored Procedure: Fetch Cost for Owner Only
CREATE OR REPLACE FUNCTION public.get_product_purchase_cost(
    p_shop_id UUID,
    p_product_id UUID
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_cost NUMERIC(12,2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Strict Authorization: Only shop owners can retrieve purchase cost
    IF NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Access denied: Only shop owners can view purchase cost';
    END IF;

    SELECT purchase_price INTO v_cost
    FROM public.products
    WHERE id = p_product_id AND shop_id = p_shop_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    RETURN COALESCE(v_cost, 0.00);
END;
$$;
