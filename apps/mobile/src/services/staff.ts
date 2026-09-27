import { supabase, isSupabaseConfigured } from './supabase';

export interface StaffMember {
  id: string; // shop_members.id
  user_id: string;
  shop_id: string;
  role: 'OWNER' | 'CASHIER';
  is_active: boolean;
  created_at: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

/**
 * Fetch all staff members for the shop.
 * Joins shop_members with profiles.
 */
export async function fetchShopStaff(
  shopId: string
): Promise<{ data: StaffMember[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('shop_members')
      .select('id, user_id, shop_id, role, is_active, created_at, profiles(full_name, email, phone)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const staff: StaffMember[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      shop_id: row.shop_id,
      role: row.role,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      full_name: row.profiles?.full_name || 'Staff Member',
      email: row.profiles?.email || null,
      phone: row.profiles?.phone || null,
    }));

    return { data: staff, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Toggle cashier active or inactive status (Owner only).
 * Inactive cashiers cannot log in or perform sales for the shop.
 */
export async function toggleStaffStatus(
  memberId: string,
  isActive: boolean
): Promise<{ error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    const { error } = await supabase
      .from('shop_members')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Assign a registered user as a CASHIER in the shop by email.
 */
export async function addCashierByEmail(
  shopId: string,
  email: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: new Error('Email is required') };
    }

    if (!isSupabaseConfigured()) {
      return { success: true, error: null };
    }

    // Lookup profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        error: new Error(
          `No registered user found with email "${cleanEmail}". The cashier must first sign up for PocketPOS with this email.`
        ),
      };
    }

    // Check if user is already a member of this shop
    const { data: existing } = await supabase
      .from('shop_members')
      .select('id, role')
      .eq('shop_id', shopId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: new Error(`User is already a ${existing.role} of this shop`),
      };
    }

    // Insert cashier membership
    const { error: insertError } = await supabase.from('shop_members').insert({
      shop_id: shopId,
      user_id: profile.id,
      role: 'CASHIER',
      is_active: true,
    });

    if (insertError) {
      return { success: false, error: new Error(insertError.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
