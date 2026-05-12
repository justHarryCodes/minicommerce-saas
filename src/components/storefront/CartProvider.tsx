"use client";

import { createContext, useContext, type ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  storeId: string | null;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

function createCartStore(storeId: string) {
  return create<CartStore>()(
    persist(
      (set, get) => ({
        items: [],
        storeId,

        addItem: (newItem: Omit<CartItem, "quantity"> & { quantity?: number }) => {
          set((state: CartStore) => {
            const existing = state.items.find((i: CartItem) => i.product_id === newItem.product_id);
            if (existing) {
              const maxQty = newItem.stock_quantity;
              return {
                items: state.items.map((i: CartItem) =>
                  i.product_id === newItem.product_id
                    ? { ...i, quantity: Math.min(i.quantity + 1, maxQty) }
                    : i
                ),
              };
            }
            return { items: [...state.items, { ...newItem, quantity: 1 }] };
          });
        },

        removeItem: (productId: string) => {
          set((state: CartStore) => ({
            items: state.items.filter((i: CartItem) => i.product_id !== productId),
          }));
        },

        updateQuantity: (productId: string, qty: number) => {
          if (qty <= 0) {
            set((state: CartStore) => ({
              items: state.items.filter((i: CartItem) => i.product_id !== productId),
            }));
          } else {
            set((state: CartStore) => ({
              items: state.items.map((i: CartItem) =>
                i.product_id === productId
                  ? { ...i, quantity: Math.min(qty, i.stock_quantity) }
                  : i
              ),
            }));
          }
        },

        clearCart: () => set({ items: [] }),

        get totalItems() {
          return get().items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);
        },
        get totalAmount() {
          return get().items.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0);
        },
      }),
      { name: `cart-${storeId}` }
    )
  );
}

type CartContextValue = CartStore & { storeId: string };
const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export default function CartProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  const store = createCartStore(storeId);
  const state = store();

  return (
    <CartContext.Provider value={{ ...state, storeId }}>
      {children}
    </CartContext.Provider>
  );
}
