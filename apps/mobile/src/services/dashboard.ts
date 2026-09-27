import { supabase, isSupabaseConfigured } from './supabase';

export interface DashboardMetrics {
  todaySalesAmount: number;
  todayOrdersCount: number;
  todayItemsCount: number;
  todayExpensesAmount: number;
  totalUdhaarAmount: number;
  lowStockCount: number;
  estimatedGrossProfit: number | null; // Only for OWNER
  recentSales: {
    id: string;
    invoice_number: string;
    total: number;
    payment_status: string;
    created_at: string;
    customer_name: string | null;
  }[];
}

/**
 * Fetch real-time operational dashboard highlights for the active shop.
 * Respects OWNER vs CASHIER roles (cost and expenses masked for cashiers).
 */
export async function fetchDashboardMetrics(
  shopId: string,
  isOwner: boolean
): Promise<{ data: DashboardMetrics; error: Error | null }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayIso = today.toISOString();

    if (!isSupabaseConfigured()) {
      return {
        data: {
          todaySalesAmount: 0,
          todayOrdersCount: 0,
          todayItemsCount: 0,
          todayExpensesAmount: 0,
          totalUdhaarAmount: 0,
          lowStockCount: 0,
          estimatedGrossProfit: isOwner ? 0 : null,
          recentSales: [],
        },
        error: null,
      };
    }

    // 1. Fetch Today's Sales
    const { data: salesToday, error: salesError } = await supabase
      .from('sales')
      .select('id, invoice_number, total, payment_status, created_at, customers(name)')
      .eq('shop_id', shopId)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfTodayIso)
      .order('created_at', { ascending: false });

    if (salesError) {
      console.warn('Dashboard sales query error:', salesError.message);
    }

    const todaySales = salesToday || [];
    const todaySalesAmount = todaySales.reduce((acc, s: any) => acc + (Number(s.total) || 0), 0);
    const todayOrdersCount = todaySales.length;

    // 2. Fetch Low Stock Count
    const { data: productsData } = await supabase
      .from('products')
      .select('id, current_stock, minimum_stock')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    const lowStockCount = (productsData || []).filter(
      (p: any) => Number(p.current_stock) <= Number(p.minimum_stock)
    ).length;

    // 3. Fetch Total Outstanding Udhaar (Receivables)
    const { data: customersData } = await supabase
      .from('customers')
      .select('outstanding_balance')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    const totalUdhaarAmount = (customersData || []).reduce(
      (acc, c: any) => acc + (Number(c.outstanding_balance) || 0),
      0
    );

    // 4. Fetch Today's Expenses (Owner only)
    let todayExpensesAmount = 0;
    if (isOwner) {
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('shop_id', shopId)
        .gte('created_at', startOfTodayIso);

      todayExpensesAmount = (expensesData || []).reduce(
        (acc, e: any) => acc + (Number(e.amount) || 0),
        0
      );
    }

    // 5. Fetch Recent Sales (up to 5)
    const recentSales = todaySales.slice(0, 5).map((s: any) => ({
      id: s.id,
      invoice_number: s.invoice_number,
      total: Number(s.total),
      payment_status: s.payment_status,
      created_at: s.created_at,
      customer_name: s.customers?.name || null,
    }));

    return {
      data: {
        todaySalesAmount: Math.round(todaySalesAmount * 100) / 100,
        todayOrdersCount,
        todayItemsCount: todayOrdersCount, // Quick items metric
        todayExpensesAmount: Math.round(todayExpensesAmount * 100) / 100,
        totalUdhaarAmount: Math.round(totalUdhaarAmount * 100) / 100,
        lowStockCount,
        estimatedGrossProfit: isOwner
          ? Math.max(0, Math.round((todaySalesAmount * 0.22 - todayExpensesAmount) * 100) / 100)
          : null,
        recentSales,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: {
        todaySalesAmount: 0,
        todayOrdersCount: 0,
        todayItemsCount: 0,
        todayExpensesAmount: 0,
        totalUdhaarAmount: 0,
        lowStockCount: 0,
        estimatedGrossProfit: null,
        recentSales: [],
      },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
