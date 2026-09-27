import { supabase, isSupabaseConfigured } from './supabase';
import type {
  CompleteSaleParams,
  CompleteSaleResult,
  RecordCustomerPaymentParams,
  RecordCustomerPaymentResult,
} from '../types/database';

/**
 * Executes an atomic sale checkout transaction in PostgreSQL.
 * Validates stock, calculates prices and taxes server-side,
 * records sale items, movements, payments, and Udhaar balance in one ACID block.
 */
export async function executeCompleteSaleTransaction(
  params: CompleteSaleParams
): Promise<{ data: CompleteSaleResult | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      // Mock result for offline / sandbox testing
      const mockSubtotal = params.items.reduce((acc, it) => acc + it.quantity * 100, 0);
      const mockDiscount = params.order_discount || 0;
      const mockTotal = Math.max(0, mockSubtotal - mockDiscount);
      const paidSum = params.payments
        .filter((p) => p.payment_method !== 'UDAAR')
        .reduce((acc, p) => acc + p.amount, 0);
      const creditSum = params.payments
        .filter((p) => p.payment_method === 'UDAAR')
        .reduce((acc, p) => acc + p.amount, 0);

      const mockResult: CompleteSaleResult = {
        success: true,
        sale_id: 'mock-sale-uuid-' + Date.now(),
        invoice_number: 'INV-2609-00001',
        subtotal: mockSubtotal,
        discount: mockDiscount,
        tax: 0,
        total: mockTotal,
        paid_amount: paidSum,
        credit_amount: creditSum,
        payment_status: creditSum === 0 ? 'PAID' : paidSum > 0 ? 'PARTIAL' : 'CREDIT',
      };
      return { data: mockResult, error: null };
    }

    const { data, error } = await supabase.rpc('complete_sale_transaction', {
      p_shop_id: params.shop_id,
      p_customer_id: params.customer_id || null,
      p_items: params.items,
      p_payments: params.payments,
      p_order_discount: params.order_discount || 0.0,
      p_notes: params.notes || null,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data?.success) {
      return { data: null, error: new Error('Transaction rejected by database') };
    }

    return { data: data as CompleteSaleResult, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Settles outstanding customer Udhaar debt atomically via PostgreSQL RPC.
 */
export async function executeRecordCustomerPayment(
  params: RecordCustomerPaymentParams
): Promise<{ data: RecordCustomerPaymentResult | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: {
          success: true,
          payment_id: 'mock-payment-uuid-' + Date.now(),
          previous_balance: 5000,
          paid_amount: params.amount,
          new_balance: Math.max(0, 5000 - params.amount),
        },
        error: null,
      };
    }

    const { data, error } = await supabase.rpc('record_customer_payment', {
      p_shop_id: params.shop_id,
      p_customer_id: params.customer_id,
      p_amount: params.amount,
      p_payment_method: params.payment_method,
      p_reference_number: params.reference_number || null,
      p_notes: params.notes || null,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as RecordCustomerPaymentResult, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export interface FetchSalesParams {
  shopId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SaleListItem {
  id: string;
  shop_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  credit_amount: number;
  payment_status: 'PAID' | 'PARTIAL' | 'CREDIT';
  status: 'COMPLETED' | 'VOIDED' | 'REFUNDED';
  notes: string | null;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  payments_summary?: string;
}

export interface SaleDetailView extends SaleListItem {
  items: {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
  }[];
  payments: {
    id: string;
    payment_method: string;
    amount: number;
    reference_number: string | null;
  }[];
}

/**
 * Fetch sales list for shop history.
 */
export async function fetchShopSales({
  shopId,
  search,
  limit = 50,
  offset = 0,
}: FetchSalesParams): Promise<{ data: SaleListItem[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('sales')
      .select('id, shop_id, invoice_number, subtotal, discount, tax, total, paid_amount, credit_amount, payment_status, status, notes, created_at, customers(name, phone), payments(payment_method, amount)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      const q = search.trim();
      query = query.ilike('invoice_number', `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const items: SaleListItem[] = (data || []).map((row: any) => {
      const customer = row.customers;
      const payments = row.payments || [];
      const paymentSummary = payments
        .map((p: any) => `${p.payment_method}: Rs. ${Number(p.amount)}`)
        .join(', ');

      return {
        id: row.id,
        shop_id: row.shop_id,
        invoice_number: row.invoice_number,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        tax: Number(row.tax),
        total: Number(row.total),
        paid_amount: Number(row.paid_amount),
        credit_amount: Number(row.credit_amount),
        payment_status: row.payment_status,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        payments_summary: paymentSummary,
      };
    });

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch complete sale detail including line items and payments.
 */
export async function fetchSaleDetails(
  shopId: string,
  saleId: string
): Promise<{ data: SaleDetailView | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .select('id, shop_id, invoice_number, subtotal, discount, tax, total, paid_amount, credit_amount, payment_status, status, notes, created_at, customers(name, phone)')
      .eq('shop_id', shopId)
      .eq('id', saleId)
      .maybeSingle();

    if (saleError || !saleData) {
      return { data: null, error: saleError ? new Error(saleError.message) : new Error('Sale not found') };
    }

    // Fetch sale items (omits unit_cost for cashier security)
    const { data: itemsData } = await supabase
      .from('sale_items')
      .select('id, product_id, quantity, unit_price, discount, line_total, products(name)')
      .eq('sale_id', saleId);

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, payment_method, amount, reference_number')
      .eq('sale_id', saleId);

    const items = (itemsData || []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.products?.name || 'Unknown Item',
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount: Number(it.discount),
      line_total: Number(it.line_total),
    }));

    const payments = (paymentsData || []).map((p: any) => ({
      id: p.id,
      payment_method: p.payment_method,
      amount: Number(p.amount),
      reference_number: p.reference_number || null,
    }));

    const customer = (saleData as any).customers;

    return {
      data: {
        id: saleData.id,
        shop_id: saleData.shop_id,
        invoice_number: saleData.invoice_number,
        subtotal: Number(saleData.subtotal),
        discount: Number(saleData.discount),
        tax: Number(saleData.tax),
        total: Number(saleData.total),
        paid_amount: Number(saleData.paid_amount),
        credit_amount: Number(saleData.credit_amount),
        payment_status: saleData.payment_status,
        status: saleData.status,
        notes: saleData.notes,
        created_at: saleData.created_at,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        items,
        payments,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

