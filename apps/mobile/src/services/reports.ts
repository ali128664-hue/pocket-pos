import { supabase, isSupabaseConfigured } from './supabase';

export interface SalesReportSummary {
  orderCount: number;
  grossSales: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  paidAmount: number;
  creditAmount: number;
}

export interface PaymentBreakdownItem {
  method: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface LowStockReportItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

export async function fetchSalesReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: SalesReportSummary; error: Error | null }> {
  try {
    const empty: SalesReportSummary = {
      orderCount: 0,
      grossSales: 0,
      totalDiscount: 0,
      totalTax: 0,
      netRevenue: 0,
      paidAmount: 0,
      creditAmount: 0,
    };

    if (!isSupabaseConfigured()) {
      return { data: empty, error: null };
    }

    let query = supabase
      .from('sales')
      .select('subtotal, discount, tax, total, paid_amount, credit_amount')
      .eq('shop_id', shopId)
      .eq('status', 'COMPLETED');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: empty, error: new Error(error.message) };
    }

    const sales = data || [];
    let gross = 0;
    let disc = 0;
    let tax = 0;
    let total = 0;
    let paid = 0;
    let credit = 0;

    sales.forEach((s: any) => {
      gross += Number(s.subtotal) || 0;
      disc += Number(s.discount) || 0;
      tax += Number(s.tax) || 0;
      total += Number(s.total) || 0;
      paid += Number(s.paid_amount) || 0;
      credit += Number(s.credit_amount) || 0;
    });

    return {
      data: {
        orderCount: sales.length,
        grossSales: Math.round(gross * 100) / 100,
        totalDiscount: Math.round(disc * 100) / 100,
        totalTax: Math.round(tax * 100) / 100,
        netRevenue: Math.round(total * 100) / 100,
        paidAmount: Math.round(paid * 100) / 100,
        creditAmount: Math.round(credit * 100) / 100,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: {
        orderCount: 0,
        grossSales: 0,
        totalDiscount: 0,
        totalTax: 0,
        netRevenue: 0,
        paidAmount: 0,
        creditAmount: 0,
      },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function fetchPaymentBreakdown(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: PaymentBreakdownItem[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('payments')
      .select('payment_method, amount')
      .eq('shop_id', shopId);

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

    const methodMap: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;

    (data || []).forEach((row: any) => {
      const m = row.payment_method || 'CASH';
      const amt = Number(row.amount) || 0;
      if (!methodMap[m]) methodMap[m] = { total: 0, count: 0 };
      methodMap[m].total += amt;
      methodMap[m].count += 1;
      grandTotal += amt;
    });

    const items: PaymentBreakdownItem[] = Object.entries(methodMap).map(([method, stats]) => ({
      method,
      total: Math.round(stats.total * 100) / 100,
      count: stats.count,
      percentage: grandTotal > 0 ? Math.round((stats.total / grandTotal) * 100) : 0,
    }));

    return { data: items.sort((a, b) => b.total - a.total), error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function fetchLowStockReport(
  shopId: string
): Promise<{ data: LowStockReportItem[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, barcode, current_stock, minimum_stock, unit')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('current_stock', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const lowStock = (data || [])
      .filter((p: any) => Number(p.current_stock) <= Number(p.minimum_stock))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || null,
        barcode: p.barcode || null,
        currentStock: Number(p.current_stock),
        minimumStock: Number(p.minimum_stock),
        unit: p.unit || 'pcs',
      }));

    return { data: lowStock, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}
