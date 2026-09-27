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

/**
 * Update an existing customer profile.
 */
export async function updateCustomer(
  shopId: string,
  customerId: string,
  input: Partial<CreateCustomerInput>
): Promise<{ data: Customer | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) {
      const cleanName = input.name.trim();
      if (!cleanName) return { data: null, error: new Error('Customer name cannot be empty') };
      updates.name = cleanName;
    }
    if (input.phone !== undefined) {
      updates.phone = input.phone && input.phone.trim() ? input.phone.trim() : null;
    }
    if (input.email !== undefined) {
      updates.email = input.email && input.email.trim() ? input.email.trim() : null;
    }
    if (input.address !== undefined) {
      updates.address = input.address && input.address.trim() ? input.address.trim() : null;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('shop_id', shopId)
      .eq('id', customerId)
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

/**
 * Fetch chronological Khata statement/ledger for a specific customer.
 * Combines unpaid sales (debits) and recorded payments (credits).
 */
export async function fetchCustomerLedger(
  shopId: string,
  customerId: string
): Promise<{ data: any[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    // 1. Fetch sales that incurred credit
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id, invoice_number, credit_amount, total, created_at, notes')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .gt('credit_amount', 0)
      .order('created_at', { ascending: false });

    if (salesError) {
      return { data: [], error: new Error(salesError.message) };
    }

    // 2. Fetch payments received from customer
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('customer_payments')
      .select('id, amount, payment_method, reference_number, notes, created_at')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return { data: [], error: new Error(paymentsError.message) };
    }

    const debits = (salesData || []).map((s: any) => ({
      id: 'sale-' + s.id,
      type: 'DEBIT' as const,
      amount: Number(s.credit_amount),
      date: s.created_at,
      description: `Sale ${s.invoice_number}`,
      reference_number: s.invoice_number,
      payment_method: 'UDAAR',
      sale_id: s.id,
    }));

    const credits = (paymentsData || []).map((p: any) => ({
      id: 'pay-' + p.id,
      type: 'CREDIT' as const,
      amount: Number(p.amount),
      date: p.created_at,
      description: `Payment (${p.payment_method})`,
      reference_number: p.reference_number || null,
      payment_method: p.payment_method,
      sale_id: null,
    }));

    // Merge and sort newest first
    const merged = [...debits, ...credits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { data: merged, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch total customer count and total outstanding market receivables (Udhaar).
 */
export async function fetchShopCustomersSummary(
  shopId: string
): Promise<{ totalCustomers: number; totalUdhaar: number; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { totalCustomers: 0, totalUdhaar: 0, error: null };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('outstanding_balance')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (error) {
      return { totalCustomers: 0, totalUdhaar: 0, error: new Error(error.message) };
    }

    const totalCustomers = (data || []).length;
    const totalUdhaar = (data || []).reduce(
      (sum, row: any) => sum + (Number(row.outstanding_balance) || 0),
      0
    );

    return { totalCustomers, totalUdhaar: Math.round(totalUdhaar * 100) / 100, error: null };
  } catch (err: any) {
    return { totalCustomers: 0, totalUdhaar: 0, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

