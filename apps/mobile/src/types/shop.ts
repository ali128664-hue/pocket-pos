export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  phone: string;
  address: string | null;
  city: string;
  country: string;
  currency: string;
  tax_rate: number;
  tax_number: string | null;
  invoice_prefix: string;
  allow_negative_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserShopMembership {
  id: string;
  shop_id: string;
  user_id: string;
  role: 'OWNER' | 'CASHIER';
  is_active: boolean;
  created_at: string;
  shop?: Shop;
}

export interface CreateShopParams {
  name: string;
  phone: string;
  city: string;
  address?: string;
  currency?: string;
  tax_rate?: number;
  invoice_prefix?: string;
  logo_url?: string | null;
}
