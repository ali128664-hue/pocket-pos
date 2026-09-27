import { supabase, isSupabaseConfigured } from './supabase';
import type { Shop } from '../types/shop';

export interface UpdateShopInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  tax_rate?: number;
  invoice_prefix?: string;
  logo_url?: string | null;
}

/**
 * Update shop configuration and tax settings.
 * RLS enforces that only the shop OWNER can update public.shops.
 */
export async function updateShopSettings(
  shopId: string,
  input: UpdateShopInput
): Promise<{ data: Shop | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      const cleanName = input.name.trim();
      if (!cleanName) return { data: null, error: new Error('Shop name cannot be empty') };
      payload.name = cleanName;
    }
    if (input.phone !== undefined) {
      payload.phone = input.phone && input.phone.trim() ? input.phone.trim() : null;
    }
    if (input.address !== undefined) {
      payload.address = input.address && input.address.trim() ? input.address.trim() : null;
    }
    if (input.city !== undefined) {
      payload.city = input.city && input.city.trim() ? input.city.trim() : null;
    }
    if (input.tax_rate !== undefined) {
      const rate = Number(input.tax_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return { data: null, error: new Error('Tax rate must be between 0% and 100%') };
      }
      payload.tax_rate = Math.round(rate * 100) / 100;
    }
    if (input.invoice_prefix !== undefined) {
      const prefix = input.invoice_prefix.trim().toUpperCase();
      if (!prefix) return { data: null, error: new Error('Invoice prefix cannot be empty') };
      payload.invoice_prefix = prefix;
    }
    if (input.logo_url !== undefined) {
      payload.logo_url = input.logo_url;
    }

    const { data, error } = await supabase
      .from('shops')
      .update(payload)
      .eq('id', shopId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Shop, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
