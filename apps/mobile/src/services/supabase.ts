import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Expo SecureStore storage adapter for Supabase Auth.
 * Uses hardware-backed keychain/keystore on native devices,
 * and falls back safely to localStorage on web environments.
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('SecureStoreAdapter.getItem error:', err);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('SecureStoreAdapter.setItem error:', err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('SecureStoreAdapter.removeItem error:', err);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
