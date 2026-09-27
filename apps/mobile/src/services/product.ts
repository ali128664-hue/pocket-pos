import { supabase } from './supabase';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  AdjustStockParams,
  AdjustStockResult,
  StockFilterType,
  ActiveFilterType,
} from '../types/database';

export interface FetchProductsParams {
  shopId: string;
  search?: string;
  categoryId?: string | null;
  stockFilter?: StockFilterType;
  activeFilter?: ActiveFilterType;
  page?: number;
  pageSize?: number;
  isOwner?: boolean;
}

export interface FetchProductsResult {
  data: (Product & { category_name?: string | null })[];
  totalCount: number;
  error: Error | null;
}

/**
 * Fetch products with server-side filtering, debounced search, and pagination.
 */
export async function fetchProducts({
  shopId,
  search,
  categoryId,
  stockFilter = 'ALL',
  activeFilter = 'ALL',
  page = 1,
  pageSize = 50,
  isOwner = true,
}: FetchProductsParams): Promise<FetchProductsResult> {
  try {
    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .eq('shop_id', shopId);

    // Active status filter
    if (activeFilter === 'ACTIVE') {
      query = query.eq('is_active', true);
    } else if (activeFilter === 'INACTIVE') {
      query = query.eq('is_active', false);
    } else if (!isOwner) {
      // Cashiers can only view active products
      query = query.eq('is_active', true);
    }

    // Category filter
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Stock filters
    if (stockFilter === 'IN_STOCK') {
      query = query.gt('current_stock', 0);
    } else if (stockFilter === 'OUT_OF_STOCK') {
      query = query.lte('current_stock', 0);
    }

    // Search query on name, SKU, or barcode
    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`);
    }

    // Order and pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('name', { ascending: true }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], totalCount: 0, error: new Error(error.message) };
    }

    let items = (data || []).map((row: any) => ({
      id: row.id,
      shop_id: row.shop_id,
      category_id: row.category_id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      brand: row.brand,
      description: row.description,
      unit: row.unit || 'pcs',
      // Hide purchase price from cashiers
      purchase_price: isOwner ? Number(row.purchase_price) : 0,
      selling_price: Number(row.selling_price),
      current_stock: Number(row.current_stock),
      minimum_stock: Number(row.minimum_stock),
      image_url: row.image_url,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_name: row.categories?.name || null,
    }));

    // Post-filter for LOW_STOCK if selected (since SQL compare across columns current_stock <= minimum_stock)
    if (stockFilter === 'LOW_STOCK') {
      items = items.filter(
        (p) => p.current_stock > 0 && p.current_stock <= p.minimum_stock
      );
    }

    return {
      data: items,
      totalCount: count ?? items.length,
      error: null,
    };
  } catch (err: any) {
    return { data: [], totalCount: 0, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(
  shopId: string,
  productId: string,
  isOwner = true
): Promise<{ data: (Product & { category_name?: string | null }) | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single();

    if (error || !data) {
      return { data: null, error: error ? new Error(error.message) : new Error('Product not found') };
    }

    return {
      data: {
        id: data.id,
        shop_id: data.shop_id,
        category_id: data.category_id,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand,
        description: data.description,
        unit: data.unit || 'pcs',
        purchase_price: isOwner ? Number(data.purchase_price) : 0,
        selling_price: Number(data.selling_price),
        current_stock: Number(data.current_stock),
        minimum_stock: Number(data.minimum_stock),
        image_url: data.image_url,
        is_active: Boolean(data.is_active),
        created_at: data.created_at,
        updated_at: data.updated_at,
        category_name: data.categories?.name || null,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new product scoped to the active shop.
 */
export async function createProduct(
  shopId: string,
  input: CreateProductInput
): Promise<{ data: Product | null; error: Error | null }> {
  try {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { data: null, error: new Error('Product name is required') };
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        shop_id: shopId,
        category_id: input.category_id || null,
        name: trimmedName,
        sku: input.sku?.trim() || null,
        barcode: input.barcode?.trim() || null,
        brand: input.brand?.trim() || null,
        description: input.description?.trim() || null,
        unit: input.unit?.trim() || 'pcs',
        purchase_price: Math.max(0, input.purchase_price),
        selling_price: Math.max(0, input.selling_price),
        current_stock: Math.max(0, input.current_stock),
        minimum_stock: Math.max(0, input.minimum_stock),
        image_url: input.image_url || null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('barcode')) {
          return { data: null, error: new Error('A product with this barcode already exists in your shop.') };
        }
        if (error.message.includes('sku')) {
          return { data: null, error: new Error('A product with this SKU already exists in your shop.') };
        }
      }
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        ...data,
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
        current_stock: Number(data.current_stock),
        minimum_stock: Number(data.minimum_stock),
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  shopId: string,
  productId: string,
  input: UpdateProductInput
): Promise<{ data: Product | null; error: Error | null }> {
  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        return { data: null, error: new Error('Product name cannot be empty') };
      }
      payload.name = trimmedName;
    }
    if (input.category_id !== undefined) payload.category_id = input.category_id;
    if (input.sku !== undefined) payload.sku = input.sku?.trim() || null;
    if (input.barcode !== undefined) payload.barcode = input.barcode?.trim() || null;
    if (input.brand !== undefined) payload.brand = input.brand?.trim() || null;
    if (input.description !== undefined) payload.description = input.description?.trim() || null;
    if (input.unit !== undefined) payload.unit = input.unit.trim() || 'pcs';
    if (input.purchase_price !== undefined) payload.purchase_price = Math.max(0, input.purchase_price);
    if (input.selling_price !== undefined) payload.selling_price = Math.max(0, input.selling_price);
    if (input.current_stock !== undefined) payload.current_stock = Math.max(0, input.current_stock);
    if (input.minimum_stock !== undefined) payload.minimum_stock = Math.max(0, input.minimum_stock);
    if (input.image_url !== undefined) payload.image_url = input.image_url;
    if (input.is_active !== undefined) payload.is_active = input.is_active;

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('barcode')) {
          return { data: null, error: new Error('A product with this barcode already exists in your shop.') };
        }
        if (error.message.includes('sku')) {
          return { data: null, error: new Error('A product with this SKU already exists in your shop.') };
        }
      }
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        ...data,
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
        current_stock: Number(data.current_stock),
        minimum_stock: Number(data.minimum_stock),
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Activate or deactivate a product.
 * Preserves product history and inventory records.
 */
export async function setProductActiveStatus(
  shopId: string,
  productId: string,
  isActive: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('shop_id', shopId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Adjust stock manually through atomic RPC adjust_product_stock.
 */
export async function adjustStock(
  params: AdjustStockParams
): Promise<{ data: AdjustStockResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('adjust_product_stock', {
      p_shop_id: params.shop_id,
      p_product_id: params.product_id,
      p_quantity_change: params.quantity_change,
      p_movement_type: params.movement_type,
      p_notes: params.notes || 'Manual stock adjustment',
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as AdjustStockResult, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
