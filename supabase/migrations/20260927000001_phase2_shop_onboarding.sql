-- ==============================================================================
-- POCKETPOS: Phase 2 — Shop Onboarding & Membership Schema
-- ==============================================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Shops table
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    logo_url TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT NOT NULL DEFAULT 'Karachi',
    country TEXT NOT NULL DEFAULT 'Pakistan',
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    tax_number TEXT,
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);

-- 3. User roles enum and shop_members table
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'CASHIER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.shop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_members_user ON public.shop_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shop_members_shop ON public.shop_members(shop_id, is_active);

-- 4. Helper Security Functions
CREATE OR REPLACE FUNCTION public.get_auth_shop_ids()
RETURNS TABLE(shop_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT shop_id 
    FROM public.shop_members 
    WHERE user_id = auth.uid() 
      AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.shop_members 
        WHERE shop_id = p_shop_id 
          AND user_id = auth.uid() 
          AND role = 'OWNER' 
          AND is_active = TRUE
    );
$$;

-- 5. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own shops" ON public.shops;
CREATE POLICY "Members can view their own shops"
    ON public.shops FOR SELECT
    USING (id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Owners can update their shop settings" ON public.shops;
CREATE POLICY "Owners can update their shop settings"
    ON public.shops FOR UPDATE
    USING (public.is_shop_owner(id));

ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view shop staff" ON public.shop_members;
CREATE POLICY "Members can view shop staff"
    ON public.shop_members FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

DROP POLICY IF EXISTS "Owners can manage staff" ON public.shop_members;
CREATE POLICY "Owners can manage staff"
    ON public.shop_members FOR ALL
    USING (public.is_shop_owner(shop_id));

-- 6. Atomic Stored Procedure: create_shop_with_owner
CREATE OR REPLACE FUNCTION public.create_shop_with_owner(
    p_name TEXT,
    p_phone TEXT,
    p_city TEXT,
    p_address TEXT DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'PKR',
    p_tax_rate NUMERIC DEFAULT 0.00,
    p_invoice_prefix VARCHAR DEFAULT 'INV',
    p_logo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_shop_id UUID;
    v_shop RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a shop';
    END IF;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        v_user_id,
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'Shop Owner'),
        COALESCE((SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = v_user_id), p_phone)
    )
    ON CONFLICT (id) DO UPDATE 
        SET updated_at = NOW();

    -- Create shop
    INSERT INTO public.shops (
        owner_id,
        name,
        phone,
        city,
        address,
        currency,
        tax_rate,
        invoice_prefix,
        logo_url
    ) VALUES (
        v_user_id,
        TRIM(p_name),
        TRIM(p_phone),
        TRIM(p_city),
        CASE WHEN TRIM(p_address) = '' THEN NULL ELSE TRIM(p_address) END,
        COALESCE(NULLIF(TRIM(p_currency), ''), 'PKR'),
        COALESCE(p_tax_rate, 0.00),
        COALESCE(NULLIF(TRIM(p_invoice_prefix), ''), 'INV'),
        p_logo_url
    )
    RETURNING id INTO v_shop_id;

    -- Create OWNER membership
    INSERT INTO public.shop_members (
        shop_id,
        user_id,
        role,
        is_active
    ) VALUES (
        v_shop_id,
        v_user_id,
        'OWNER',
        TRUE
    );

    SELECT * INTO v_shop FROM public.shops WHERE id = v_shop_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'shop', row_to_json(v_shop),
        'role', 'OWNER'
    );
END;
$$;
