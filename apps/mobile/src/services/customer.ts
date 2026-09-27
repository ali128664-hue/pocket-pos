import { supabase, isSupabaseConfigured } from './supabase';
import type { Customer } from '../types/database';

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface FetchCustomersResult {
  data: Customer[];
  error: Error | null;
}

/**
 * Fetch all active customers for a shop with optional name or phone search.
 * Strictly scoped to shop_id for multi-tenant isolation.
 */
export async function fetchCustomers(
  shopId: string,
  searchQuery?: string
): Promise<FetchCustomersResult> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const items: Customer[] = (data || []).map((row: any) => ({
      id: row.id,
      shop_id: row.shop_id,
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      address: row.address || null,
      notes: row.notes || null,
      outstanding_balance: Number(row.outstanding_balance) || 0,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch a single customer by ID within a shop.
 */
export async function fetchCustomerById(
  shopId: string,
  customerId: string
): Promise<{ data: Customer | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('id', customerId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const row = data as any;
    return {
      data: {
        id: row.id,
        shop_id: row.shop_id,
        name: row.name,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        notes: row.notes || null,
        outstanding_balance: Number(row.outstanding_balance) || 0,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new customer for the shop with duplicate phone prevention.
 */
export async function createCustomer(
  shopId: string,
  input: CreateCustomerInput
): Promise<{ data: Customer | null; error: Error | null }> {
  try {
    const cleanName = input.name.trim();
    if (!cleanName) {
      return { data: null, error: new Error('Customer name is required') };
    }

    const cleanPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;

    // Check if phone already registered in this shop
    if (cleanPhone) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id, name')
        .eq('shop_id', shopId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: new Error(`A customer with phone ${cleanPhone} already exists: "${existing.name}"`),
        };
      }
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        shop_id: shopId,
        name: cleanName,
        phone: cleanPhone,
        email: input.email && input.email.trim() ? input.email.trim() : null,
        address: input.address && input.address.trim() ? input.address.trim() : null,
        notes: input.notes && input.notes.trim() ? input.notes.trim() : null,
        outstanding_balance: 0.0,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const row = data as any;
    return {
      data: {
        id: row.id,
        shop_id: row.shop_id,
        name: row.name,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        notes: row.notes || null,
        outstanding_balance: Number(row.outstanding_balance) || 0,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
