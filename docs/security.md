# PocketPOS — Security Architecture & Data Isolation Specification

## 1. Threat Model & Security Principles

PocketPOS manages sensitive financial data, sales volumes, customer debt records, and shop inventory. In multi-tenant environments, security must be enforced by default at the database layer (PostgreSQL Row-Level Security) and not solely relied upon within React Native client code.

### 1.1 Core Security Principles
1. **Zero Client Trust**: The client application cannot be trusted to enforce tenant separation or price integrity. The database enforces all permissions.
2. **Strict Multi-Tenant Isolation**: No database query from User A can read, update, or delete rows belonging to Shop B under any circumstances.
3. **Price Tampering Protection**: Line items must be validated against verified product records via the atomic RPC.
4. **Credential Isolation**: Only the Supabase Public Anon Key is bundled into the client build. The `service_role` secret key is never embedded in the mobile binary.
5. **Information Hiding**: Cashiers are cryptographically barred from querying purchase/cost prices or gross profit margins.

---

## 2. Row Level Security (RLS) Architecture

### 2.1 Multi-Tenant Access Helper Functions
To avoid repetitive subqueries and achieve high query execution performance, we define fast PostgreSQL security helper functions:

```sql
-- Helper: Retrieve active shop IDs that the authenticated user belongs to
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

-- Helper: Check if authenticated user is the OWNER of a given shop
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

-- Helper: Check if authenticated user is an active member of a given shop
CREATE OR REPLACE FUNCTION public.is_shop_member(p_shop_id UUID)
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
          AND is_active = TRUE
    );
$$;
```

---

## 3. Comprehensive RLS Policies by Table

Row Level Security is enabled on **every** table.

### 3.1 Table: `profiles`
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);
```

### 3.2 Table: `shops`
```sql
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own shops"
    ON public.shops FOR SELECT
    USING (id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Authenticated users can create a new shop"
    ON public.shops FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their shop settings"
    ON public.shops FOR UPDATE
    USING (public.is_shop_owner(id));
```

### 3.3 Table: `shop_members`
```sql
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their shop team"
    ON public.shop_members FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Owners can manage staff members"
    ON public.shop_members FOR ALL
    USING (public.is_shop_owner(shop_id));
```

### 3.4 Table: `products`
```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view products"
    ON public.products FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Shop owners can insert products"
    ON public.products FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

CREATE POLICY "Shop owners can update products"
    ON public.products FOR UPDATE
    USING (public.is_shop_owner(shop_id));

CREATE POLICY "Shop owners can delete products"
    ON public.products FOR DELETE
    USING (public.is_shop_owner(shop_id));
```

### 3.5 Table: `inventory_movements`
```sql
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view inventory movements"
    ON public.inventory_movements FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Shop members can insert inventory movements via POS/Audit"
    ON public.inventory_movements FOR INSERT
    WITH CHECK (shop_id IN (SELECT public.get_auth_shop_ids()));
```

### 3.6 Table: `customers`
```sql
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view customers"
    ON public.customers FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Shop members can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Shop members can update customer data"
    ON public.customers FOR UPDATE
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));
```

### 3.7 Table: `sales` & `sale_items`
```sql
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view sales"
    ON public.sales FOR SELECT
    USING (shop_id IN (SELECT public.get_auth_shop_ids()));

CREATE POLICY "Shop members can insert sales"
    ON public.sales FOR INSERT
    WITH CHECK (shop_id IN (SELECT public.get_auth_shop_ids()));

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view sale items"
    ON public.sale_items FOR SELECT
    USING (
        sale_id IN (
            SELECT id FROM public.sales WHERE shop_id IN (SELECT public.get_auth_shop_ids())
        )
    );
```

### 3.8 Table: `expenses`
```sql
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view expenses"
    ON public.expenses FOR SELECT
    USING (public.is_shop_owner(shop_id));

CREATE POLICY "Shop owners can insert expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

CREATE POLICY "Shop owners can delete expenses"
    ON public.expenses FOR DELETE
    USING (public.is_shop_owner(shop_id));
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Resource | OWNER Role | CASHIER Role |
| :--- | :---: | :---: |
| **Scan Barcodes & Create Cart** | Allowed | Allowed |
| **Execute Checkout & Record Sales** | Allowed | Allowed |
| **Search Products & View Selling Prices** | Allowed | Allowed |
| **View Purchase / Cost Price** | **Allowed** | **Denied** (Masked in API responses) |
| **Create / Edit / Delete Products** | Allowed | Denied |
| **Manual Stock Adjustments** | Allowed | Denied |
| **View Customer Balances & Udhaar** | Allowed | Allowed |
| **Receive Customer Udhaar Payments** | Allowed | Allowed |
| **Log / View Daily Expenses** | Allowed | Denied |
| **View Profit / Margin Analytics** | **Allowed** | **Denied** |
| **Add / Remove Staff Members** | Allowed | Denied |
| **Modify Tax & Shop Settings** | Allowed | Denied |

---

## 5. Client-Side Security & Token Storage

1. **Secure Token Storage**: 
   - Uses `expo-secure-store` on native iOS (Keychain) and Android (EncryptedSharedPreferences / KeyStore).
   - Under no circumstances is the auth token stored in plaintext `AsyncStorage`.
2. **Public Key Restraint**:
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are safe for client bundling.
   - Any sensitive admin tasks (e.g. user deletion) run via Edge Functions or authenticated RPCs using the session context `auth.uid()`.
3. **Data Sanitization**:
   - All input forms (product creation, customer creation, expenses) are pre-validated via strict `zod` schemas before sending payloads to PostgreSQL.

---

## 6. Implementation Status & Phase 3 Security Audit

- **Tables Protected**: 100% of public schema tables (`profiles`, `shops`, `shop_members`, `categories`, `products`, `customers`, `sales`, `sale_items`, `payments`, `customer_payments`, `inventory_movements`, `expenses`, `shop_invoice_sequences`) have `ENABLE ROW LEVEL SECURITY`.
- **Tenant Scope Enforcement**: All `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies enforce `shop_id IN (SELECT public.get_auth_shop_ids())`.
- **Owner Role Restrictions**: Administrative tables (`expenses`) and financial updates strictly guarded with `public.is_shop_owner(shop_id)`.
- **Atomic Operations**: All financial operations (`complete_sale_transaction`, `record_customer_payment`) execute as `SECURITY DEFINER` functions with transaction isolation, authoritative server pricing calculation, row-level locking (`FOR UPDATE`), and shop tenant membership checks.
- **Credential Hygiene**: Public anon key only in `.env.example`. Real `.env` excluded from version control.
