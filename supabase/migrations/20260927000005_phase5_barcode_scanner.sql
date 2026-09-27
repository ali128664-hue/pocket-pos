-- ==============================================================================
-- POCKETPOS: Phase 5 — Mobile Barcode Scanner & Product Lookup
-- ==============================================================================

-- Secure Stored Procedure: Look up product by exact barcode with role-based security
CREATE OR REPLACE FUNCTION public.lookup_product_by_barcode(
    p_shop_id UUID,
    p_barcode TEXT
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
    v_clean_barcode TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Strict multi-tenant verification: Caller must be active shop member
    IF NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = v_caller_id 
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an active member of shop %', p_shop_id;
    END IF;

    v_clean_barcode := trim(p_barcode);
    IF v_clean_barcode IS NULL OR v_clean_barcode = '' THEN
        RETURN;
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
        -- Role-isolated purchase_price: 0.00 for Cashier, real value for Owner
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
      AND trim(p.barcode) = v_clean_barcode
      AND (p.is_active = TRUE OR v_is_owner = TRUE)
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_product_by_barcode(UUID, TEXT) TO authenticated;
