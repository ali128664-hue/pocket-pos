import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'OWNER' | 'CASHIER';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
