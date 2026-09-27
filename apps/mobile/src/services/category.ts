import { supabase } from './supabase';
import type {
  Category,
  CategoryWithCount,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../types/database';

/**
 * Fetch all categories for a shop with their assigned product counts.
 */
export async function fetchCategories(
  shopId: string
): Promise<{ data: CategoryWithCount[]; error: Error | null }> {
  try {
    // Attempt to use fast aggregation RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_shop_categories_with_count',
      { p_shop_id: shopId }
    );

    if (!rpcError && rpcData) {
      return {
        data: rpcData.map((c: any) => ({
          ...c,
          product_count: Number(c.product_count) || 0,
        })),
        error: null,
      };
    }

    // Fallback: standard PostgREST join query
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(id)')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const categoriesWithCount: CategoryWithCount[] = (data || []).map((cat: any) => ({
      id: cat.id,
      shop_id: cat.shop_id,
      name: cat.name,
      description: cat.description,
      created_at: cat.created_at,
      updated_at: cat.updated_at,
      product_count: Array.isArray(cat.products) ? cat.products.length : 0,
    }));

    return { data: categoriesWithCount, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new category for a shop.
 * Enforces unique name per shop constraint.
 */
export async function createCategory(
  shopId: string,
  input: CreateCategoryInput
): Promise<{ data: Category | null; error: Error | null }> {
  try {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { data: null, error: new Error('Category name cannot be empty') };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        shop_id: shopId,
        name: trimmedName,
        description: input.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        return {
          data: null,
          error: new Error(`A category named "${trimmedName}" already exists in your shop.`),
        };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  shopId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<{ data: Category | null; error: Error | null }> {
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        return { data: null, error: new Error('Category name cannot be empty') };
      }
      updatePayload.name = trimmedName;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description?.trim() || null;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        return {
          data: null,
          error: new Error(`A category with this name already exists in your shop.`),
        };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Safely delete a category.
 * Prevents deletion if any products are currently associated with it.
 */
export async function deleteCategory(
  shopId: string,
  categoryId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // First, check via safe RPC
    const { error: rpcError } = await supabase.rpc('delete_category_safe', {
      p_shop_id: shopId,
      p_category_id: categoryId,
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // Fallback: Check products count client-side before deleting
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('category_id', categoryId);

    if (countError) {
      return { success: false, error: new Error(countError.message) };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: new Error(
          `Cannot delete category: ${count} product${count > 1 ? 's are' : ' is'} currently assigned to it. Reassign or delete them first.`
        ),
      };
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('shop_id', shopId);

    if (deleteError) {
      return { success: false, error: new Error(deleteError.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
