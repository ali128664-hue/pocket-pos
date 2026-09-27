export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'EASYPAISA'
  | 'JAZZCASH'
  | 'UDAAR';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'CREDIT';

export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';

export type StockMovementType =
  | 'SALE'
  | 'PURCHASE_RECEIPT'
  | 'MANUAL_CORRECTION'
  | 'DAMAGED_EXPIRED'
  | 'RETURN';

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES'
  | 'TRANSPORT'
  | 'MARKETING'
  | 'MAINTENANCE'
  | 'OTHER';

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  description: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  invoice_number: string;
  cashier_id: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  credit_amount: number;
  payment_status: PaymentStatus;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  line_total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  shop_id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference_number: string | null;
  received_by: string;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  shop_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  received_by: string;
  notes: string | null;
  created_at: string;
}

export interface CustomerLedgerEntry {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  date: string;
  description: string;
  reference_number?: string | null;
  payment_method?: string | null;
  sale_id?: string | null;
}

export interface InventoryMovement {
  id: string;
  shop_id: string;
  product_id: string;
  sale_id: string | null;
  user_id: string;
  movement_type: StockMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  category: string;
  amount: number;
  note: string | null;
  logged_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShopInvoiceSequence {
  shop_id: string;
  next_number: number;
  updated_at: string;
}

// RPC Input & Output Types
export interface CompleteSaleItemInput {
  product_id: string;
  quantity: number;
  discount?: number;
}

export interface CompleteSalePaymentInput {
  payment_method: PaymentMethod;
  amount: number;
  reference_number?: string | null;
}

export interface CompleteSaleParams {
  shop_id: string;
  customer_id?: string | null;
  items: CompleteSaleItemInput[];
  payments: CompleteSalePaymentInput[];
  order_discount?: number;
  notes?: string | null;
}

export interface CompleteSaleResult {
  success: boolean;
  sale_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  credit_amount: number;
  payment_status: PaymentStatus;
}

export interface RecordCustomerPaymentParams {
  shop_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH';
  reference_number?: string | null;
  notes?: string | null;
}

export interface RecordCustomerPaymentResult {
  success: boolean;
  payment_id: string;
  previous_balance: number;
  paid_amount: number;
  new_balance: number;
}

// Phase 4: Product & Category Management Types
export interface CategoryWithCount extends Category {
  product_count: number;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
}

export interface CreateProductInput {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category_id?: string | null;
  description?: string | null;
  unit?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category_id?: string | null;
  description?: string | null;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  image_url?: string | null;
  is_active?: boolean;
}

export interface AdjustStockParams {
  shop_id: string;
  product_id: string;
  quantity_change: number;
  movement_type: 'MANUAL_CORRECTION' | 'PURCHASE_RECEIPT' | 'DAMAGED_EXPIRED' | 'RETURN';
  notes?: string | null;
}

export interface AdjustStockResult {
  success: boolean;
  product_id: string;
  movement_id: string;
  previous_stock: number;
  quantity_change: number;
  new_stock: number;
}

export type StockFilterType = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type ActiveFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';

