import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserShopMemberships, createShopWithOwner } from '../services/shop';
import type { Shop, UserShopMembership, CreateShopParams } from '../types/shop';

interface ShopContextType {
  currentShop: Shop | null;
  memberships: UserShopMembership[];
  currentRole: 'OWNER' | 'CASHIER' | null;
  isOwner: boolean;
  isLoadingShop: boolean;
  hasShop: boolean;
  refreshShop: () => Promise<void>;
  createShop: (params: CreateShopParams) => Promise<{ shop: Shop | null; error: Error | null }>;
}


const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [memberships, setMemberships] = useState<UserShopMembership[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState<boolean>(true);

  const refreshShop = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setIsLoadingShop(true);
      const { data, error } = await fetchUserShopMemberships(user.id);
      if (error) {
        console.warn('Error fetching shop memberships:', error.message);
        setCurrentShop(null);
        setMemberships([]);
      } else if (data && data.length > 0) {
        setMemberships(data);
        setCurrentShop(data[0].shop || null);
      } else {
        setMemberships([]);
        setCurrentShop(null);
      }
    } catch (err) {
      console.warn('refreshShop exception:', err);
      setCurrentShop(null);
      setMemberships([]);
    } finally {
      setIsLoadingShop(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user) {
      return;
    }

    let isMounted = true;

    fetchUserShopMemberships(user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Error fetching shop memberships:', error.message);
          setCurrentShop(null);
          setMemberships([]);
        } else if (data && data.length > 0) {
          setMemberships(data);
          setCurrentShop(data[0].shop || null);
        } else {
          setMemberships([]);
          setCurrentShop(null);
        }
        setIsLoadingShop(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('loadShopData exception:', err);
        setCurrentShop(null);
        setMemberships([]);
        setIsLoadingShop(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, isAuthLoading]);

  const createShop = useCallback(
    async (params: CreateShopParams) => {
      if (!user) {
        return { shop: null, error: new Error('User must be logged in to create a shop') };
      }

      setIsLoadingShop(true);
      const { shop, error } = await createShopWithOwner(user.id, params);
      if (error) {
        setIsLoadingShop(false);
        return { shop: null, error };
      }

      if (shop) {
        setCurrentShop(shop);
        const newMembership: UserShopMembership = {
          id: 'membership-' + shop.id,
          shop_id: shop.id,
          user_id: user.id,
          role: 'OWNER',
          is_active: true,
          created_at: new Date().toISOString(),
          shop,
        };
        setMemberships([newMembership]);
      }

      setIsLoadingShop(false);
      return { shop, error: null };
    },
    [user]
  );

  const contextValue = useMemo<ShopContextType>(() => {
    const activeShop = user ? currentShop : null;
    const activeMemberships = user ? memberships : [];
    const isShopLoading = isAuthenticated && user ? (isAuthLoading || isLoadingShop) : false;

    const activeRole = activeShop
      ? activeMemberships.find((m) => m.shop_id === activeShop.id)?.role || 'CASHIER'
      : null;

    return {
      currentShop: activeShop,
      memberships: activeMemberships,
      currentRole: activeRole,
      isOwner: activeRole === 'OWNER',
      isLoadingShop: isShopLoading,
      hasShop: Boolean(activeShop),
      refreshShop,
      createShop,
    };
  }, [user, currentShop, memberships, isAuthenticated, isAuthLoading, isLoadingShop, refreshShop, createShop]);


  return <ShopContext.Provider value={contextValue}>{children}</ShopContext.Provider>;
};

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
