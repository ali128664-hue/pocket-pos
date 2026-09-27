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
