"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { create, useStore } from "zustand";
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

type StoreApi = ReturnType<typeof createCartStore>;

function createCartStore(storeId: string) {
  return create<CartStore>()(
    persist(
      (set, get) => ({
        items: [],
        storeId,

        addItem: (newItem) => {
          set((state) => {
            const existing = state.items.find((i) => i.product_id === newItem.product_id);
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.product_id === newItem.product_id
                    ? { ...i, quantity: Math.min(i.quantity + 1, newItem.stock_quantity) }
                    : i
                ),
              };
            }
            return { items: [...state.items, { ...newItem, quantity: newItem.quantity ?? 1 }] };
          });
        },

        removeItem: (productId) => {
          set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) }));
        },

        updateQuantity: (productId, qty) => {
          if (qty <= 0) {
            set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) }));
          } else {
            set((state) => ({
              items: state.items.map((i) =>
                i.product_id === productId
                  ? { ...i, quantity: Math.min(qty, i.stock_quantity) }
                  : i
              ),
            }));
          }
        },

        clearCart: () => set({ items: [] }),

        get totalItems() {
          return get().items.reduce((sum, i) => sum + i.quantity, 0);
        },
        get totalAmount() {
          return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        },
      }),
      { name: `cart-${storeId}` }
    )
  );
}

type CartContextValue = { storeApi: StoreApi; storeId: string };
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  const state = useStore(ctx.storeApi);
  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { ...state, totalItems, totalAmount };
}

export default function CartProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  // Create the store exactly once per storeId, never recreated on re-render
  const storeRef = useRef<StoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCartStore(storeId);
  }

  return (
    <CartContext.Provider value={{ storeApi: storeRef.current, storeId }}>
      {children}
    </CartContext.Provider>
  );
}
