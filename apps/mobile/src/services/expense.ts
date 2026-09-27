import { supabase, isSupabaseConfigured } from './supabase';
import type { Expense } from '../types/database';

export const EXPENSE_CATEGORIES = [
  'RENT',
  'UTILITIES',
  'SALARIES',
  'TRANSPORT',
  'MARKETING',
  'MAINTENANCE',
  'OTHER',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface CreateExpenseInput {
  shopId: string;
  category: string;
  amount: number;
  note?: string | null;
  loggedBy: string;
}

export interface FetchExpensesParams {
  shopId: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
  categoryBreakdown: { category: string; amount: number }[];
}

/**
 * Fetch categorized expenses for a shop.
 * RLS enforces that only the shop OWNER can read expenses.
 */
export async function fetchExpenses({
  shopId,
  startDate,
  endDate,
  category,
  limit = 50,
  offset = 0,
}: FetchExpensesParams): Promise<{ data: Expense[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const items: Expense[] = (data || []).map((row: any) => ({
      id: row.id,
      shop_id: row.shop_id,
      category: row.category,
      amount: Number(row.amount),
      note: row.note || null,
      logged_by: row.logged_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Record a new shop expense.
 * RLS ensures only the OWNER can insert expenses.
 */
export async function createExpense(
  input: CreateExpenseInput
): Promise<{ data: Expense | null; error: Error | null }> {
  try {
    if (input.amount <= 0) {
      return { data: null, error: new Error('Expense amount must be greater than zero') };
    }

    if (!input.category || !input.category.trim()) {
      return { data: null, error: new Error('Expense category is required') };
    }

    if (!isSupabaseConfigured()) {
      return {
        data: {
          id: 'mock-expense-' + Date.now(),
          shop_id: input.shopId,
          category: input.category.toUpperCase(),
          amount: input.amount,
          note: input.note || null,
          logged_by: input.loggedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        shop_id: input.shopId,
        category: input.category.toUpperCase().trim(),
        amount: Math.round(input.amount * 100) / 100,
        note: input.note && input.note.trim() ? input.note.trim() : null,
        logged_by: input.loggedBy,
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
        category: row.category,
        amount: Number(row.amount),
        note: row.note || null,
        logged_by: row.logged_by,
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
 * Delete an expense record (Owner only).
 */
export async function deleteExpense(
  shopId: string,
  expenseId: string
): Promise<{ error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('shop_id', shopId)
      .eq('id', expenseId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Compute expense aggregate totals for today or date range.
 */
export async function fetchExpenseSummary(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: ExpenseSummary; error: Error | null }> {
  try {
    const emptySummary: ExpenseSummary = { totalAmount: 0, count: 0, categoryBreakdown: [] };

    if (!isSupabaseConfigured()) {
      return { data: emptySummary, error: null };
    }

    let query = supabase
      .from('expenses')
      .select('amount, category')
      .eq('shop_id', shopId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: emptySummary, error: new Error(error.message) };
    }

    let total = 0;
    const catMap: Record<string, number> = {};

    (data || []).forEach((row: any) => {
      const amt = Number(row.amount) || 0;
      total += amt;
      const cat = row.category || 'OTHER';
      catMap[cat] = (catMap[cat] || 0) + amt;
    });

    const categoryBreakdown = Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }));

    return {
      data: {
        totalAmount: Math.round(total * 100) / 100,
        count: (data || []).length,
        categoryBreakdown,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: { totalAmount: 0, count: 0, categoryBreakdown: [] },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
