import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useShop } from './ShopContext';
import type { Product, Customer } from '../types/database';

export interface CartItem {
  product: Product & { category_name?: string | null };
  quantity: number;
  discount: number; // item-level discount in PKR
  lineTotal: number; // (quantity * selling_price) - discount
}

interface CartContextType {
  items: CartItem[];
  customer: Customer | null;
  orderDiscount: number;
  notes: string;

  // Computed values
  subtotal: number;
  itemsDiscount: number;
  totalDiscount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  totalItemsCount: number;
  uniqueProductsCount: number;

  // Actions
  addToCart: (product: Product & { category_name?: string | null }, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setOrderDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentShop } = useShop();

  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderDiscount, setOrderDiscountState] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Clear cart whenever active shop changes
  const [prevShopId, setPrevShopId] = useState(currentShop?.id);
  if (currentShop?.id !== prevShopId) {
    setPrevShopId(currentShop?.id);
    setItems([]);
    setCustomer(null);
    setOrderDiscountState(0);
    setNotes('');
  }

  const addToCart = useCallback(
    (product: Product & { category_name?: string | null }, quantityToAdd = 1) => {
      if (quantityToAdd <= 0) return;

      setItems((prevItems) => {
        const existingIndex = prevItems.findIndex((it) => it.product.id === product.id);

        if (existingIndex >= 0) {
          const updated = [...prevItems];
          const existing = updated[existingIndex];
          const newQty = existing.quantity + quantityToAdd;
          const lineTotal = Math.max(0, Math.round((newQty * existing.product.selling_price - existing.discount) * 100) / 100);

          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            lineTotal,
          };
          return updated;
        }

        const lineTotal = Math.round(quantityToAdd * product.selling_price * 100) / 100;
        return [
          ...prevItems,
          {
            product,
            quantity: quantityToAdd,
            discount: 0,
            lineTotal,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    setItems((prevItems) => {
      if (newQuantity <= 0) {
        return prevItems.filter((it) => it.product.id !== productId);
      }

      return prevItems.map((it) => {
        if (it.product.id === productId) {
          const discount = Math.min(it.discount, newQuantity * it.product.selling_price);
          const lineTotal = Math.max(0, Math.round((newQuantity * it.product.selling_price - discount) * 100) / 100);
          return {
            ...it,
            quantity: newQuantity,
            discount,
            lineTotal,
          };
        }
        return it;
      });
    });
  }, []);

  const incrementQuantity = useCallback((productId: string) => {
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.product.id === productId) {
          const newQty = it.quantity + 1;
          const lineTotal = Math.max(0, Math.round((newQty * it.product.selling_price - it.discount) * 100) / 100);
          return { ...it, quantity: newQty, lineTotal };
        }
        return it;
      })
    );
  }, []);

  const decrementQuantity = useCallback((productId: string) => {
    setItems((prevItems) => {
      const item = prevItems.find((it) => it.product.id === productId);
      if (!item) return prevItems;

      if (item.quantity <= 1) {
        return prevItems.filter((it) => it.product.id !== productId);
      }

      return prevItems.map((it) => {
        if (it.product.id === productId) {
          const newQty = it.quantity - 1;
          const discount = Math.min(it.discount, newQty * it.product.selling_price);
          const lineTotal = Math.max(0, Math.round((newQty * it.product.selling_price - discount) * 100) / 100);
          return { ...it, quantity: newQty, discount, lineTotal };
        }
        return it;
      });
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((it) => it.product.id !== productId));
  }, []);

  const setItemDiscount = useCallback((productId: string, discount: number) => {
    const cleanDiscount = Math.max(0, discount);
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.product.id === productId) {
          const maxDiscount = it.quantity * it.product.selling_price;
          const validDiscount = Math.min(cleanDiscount, maxDiscount);
          const lineTotal = Math.max(0, Math.round((it.quantity * it.product.selling_price - validDiscount) * 100) / 100);
          return { ...it, discount: validDiscount, lineTotal };
        }
        return it;
      })
    );
  }, []);

  const setOrderDiscount = useCallback((discount: number) => {
    setOrderDiscountState(Math.max(0, discount));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setOrderDiscountState(0);
    setNotes('');
  }, []);

  // Computed Totals
  const {
    subtotal,
    itemsDiscount,
    totalDiscount,
    taxRate,
    taxableAmount,
    taxAmount,
    grandTotal,
    totalItemsCount,
    uniqueProductsCount,
  } = useMemo(() => {
    const rawSubtotal = items.reduce(
      (acc, it) => acc + it.quantity * it.product.selling_price,
      0
    );
    const subtotal = Math.round(rawSubtotal * 100) / 100;

    const rawItemsDiscount = items.reduce((acc, it) => acc + it.discount, 0);
    const itemsDiscount = Math.round(rawItemsDiscount * 100) / 100;

    // Total discount cannot exceed subtotal
    const requestedTotalDiscount = itemsDiscount + orderDiscount;
    const totalDiscount = Math.min(subtotal, Math.round(requestedTotalDiscount * 100) / 100);

    const taxRate = Number(currentShop?.tax_rate) || 0;
    const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
    const taxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const totalItemsCount = items.reduce((acc, it) => acc + it.quantity, 0);
    const uniqueProductsCount = items.length;

    return {
      subtotal,
      itemsDiscount,
      totalDiscount,
      taxRate,
      taxableAmount,
      taxAmount,
      grandTotal,
      totalItemsCount,
      uniqueProductsCount,
    };
  }, [items, orderDiscount, currentShop?.tax_rate]);

  const value = useMemo(
    () => ({
      items,
      customer,
      orderDiscount,
      notes,
      subtotal,
      itemsDiscount,
      totalDiscount,
      taxRate,
      taxableAmount,
      taxAmount,
      grandTotal,
      totalItemsCount,
      uniqueProductsCount,
      addToCart,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      removeFromCart,
      setItemDiscount,
      setCustomer,
      setOrderDiscount,
      setNotes,
      clearCart,
    }),
    [
      items,
      customer,
      orderDiscount,
      notes,
      subtotal,
      itemsDiscount,
      totalDiscount,
      taxRate,
      taxableAmount,
      taxAmount,
      grandTotal,
      totalItemsCount,
      uniqueProductsCount,
      addToCart,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      removeFromCart,
      setItemDiscount,
      setOrderDiscount,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
