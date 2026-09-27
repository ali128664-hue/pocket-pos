import { supabase, isSupabaseConfigured } from './supabase';
import type { Shop, UserShopMembership, CreateShopParams } from '../types/shop';

/**
 * Fetches all active shop memberships for the given user,
 * including populated shop details.
 */
export async function fetchUserShopMemberships(
  userId: string
): Promise<{ data: UserShopMembership[] | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('shop_members')
      .select('id, shop_id, user_id, role, is_active, created_at, shops(*)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const memberships: UserShopMembership[] = (data || []).map((row: any) => ({
      id: row.id,
      shop_id: row.shop_id,
      user_id: row.user_id,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      shop: row.shops as Shop,
    }));

    return { data: memberships, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Creates a new shop and automatically assigns the authenticated user as OWNER.
 * Uses atomic RPC create_shop_with_owner when available, with resilient fallback.
 */
export async function createShopWithOwner(
  userId: string,
  params: CreateShopParams
): Promise<{ shop: Shop | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      // In-memory mock shop for sandbox testing
      const mockShop: Shop = {
        id: 'mock-shop-uuid-123',
        owner_id: userId,
        name: params.name,
        logo_url: params.logo_url || null,
        phone: params.phone,
        address: params.address || null,
        city: params.city,
        country: 'Pakistan',
        currency: params.currency || 'PKR',
        tax_rate: params.tax_rate || 0,
        tax_number: null,
        invoice_prefix: params.invoice_prefix || 'INV',
        allow_negative_stock: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { shop: mockShop, error: null };
    }

    // 1. Try atomic PostgreSQL RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'create_shop_with_owner',
      {
        p_name: params.name,
        p_phone: params.phone,
        p_city: params.city,
        p_address: params.address || null,
        p_currency: params.currency || 'PKR',
        p_tax_rate: params.tax_rate || 0.0,
        p_invoice_prefix: params.invoice_prefix || 'INV',
        p_logo_url: params.logo_url || null,
      }
    );

    if (!rpcError && rpcData?.success) {
      return { shop: rpcData.shop as Shop, error: null };
    }

    // If RPC failed due to function not existing yet, use standard table fallback
    if (rpcError && (rpcError.message.includes('function') || rpcError.code === '42883')) {
      console.info('RPC create_shop_with_owner not found; attempting direct table transaction.');

      // 1. Insert shop
      const { data: newShop, error: shopError } = await supabase
        .from('shops')
        .insert({
          owner_id: userId,
          name: params.name.trim(),
          phone: params.phone.trim(),
          city: params.city.trim(),
          address: params.address?.trim() || null,
          currency: params.currency || 'PKR',
          tax_rate: params.tax_rate || 0.0,
          invoice_prefix: params.invoice_prefix || 'INV',
          logo_url: params.logo_url || null,
        })
        .select()
        .single();

      if (shopError) {
        return { shop: null, error: new Error(shopError.message) };
      }

      // 2. Insert OWNER membership
      const { error: memberError } = await supabase.from('shop_members').insert({
        shop_id: newShop.id,
        user_id: userId,
        role: 'OWNER',
        is_active: true,
      });

      if (memberError) {
        // Rollback shop if membership fails
        await supabase.from('shops').delete().eq('id', newShop.id);
        return { shop: null, error: new Error(memberError.message) };
      }

      return { shop: newShop as Shop, error: null };
    }

    return { shop: null, error: new Error(rpcError?.message || 'Failed to create shop') };
  } catch (err: any) {
    return { shop: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
