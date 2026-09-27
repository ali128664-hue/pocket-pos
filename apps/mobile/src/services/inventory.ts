import { supabase, isSupabaseConfigured } from './supabase';
import type { InventoryMovement } from '../types/database';

export interface InventoryMovementListItem extends InventoryMovement {
  product_name: string;
  product_sku: string | null;
  product_unit: string;
}

export interface FetchMovementsParams {
  shopId: string;
  productId?: string;
  movementType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch inventory movement audit log for the shop.
 */
export async function fetchInventoryMovements({
  shopId,
  productId,
  movementType,
  limit = 50,
  offset = 0,
}: FetchMovementsParams): Promise<{ data: InventoryMovementListItem[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('inventory_movements')
      .select('id, shop_id, product_id, sale_id, user_id, movement_type, quantity, stock_before, stock_after, notes, created_at, products(name, sku, unit)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (movementType && movementType !== 'ALL') {
      query = query.eq('movement_type', movementType);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const items: InventoryMovementListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      shop_id: row.shop_id,
      product_id: row.product_id,
      sale_id: row.sale_id || null,
      user_id: row.user_id,
      movement_type: row.movement_type,
      quantity: Number(row.quantity),
      stock_before: Number(row.stock_before),
      stock_after: Number(row.stock_after),
      notes: row.notes || null,
      created_at: row.created_at,
      product_name: row.products?.name || 'Unknown Product',
      product_sku: row.products?.sku || null,
      product_unit: row.products?.unit || 'pcs',
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}
