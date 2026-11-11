"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { create, useStore } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  storeId: string | null;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size?: string | null, startsAt?: string | null) => void;
  updateQuantity: (productId: string, qty: number, size?: string | null) => void;
  clearCart: () => void;
}

// Two cart lines for the same product are distinct exactly when their size
// differs (e.g. one shirt in size M, another in size L) — undefined/null
// both mean "no size", so normalize them to the same key.
const sizeKey = (size?: string | null) => size ?? "";
// A cart line is product + size + (for services) the booked time, so two
// appointments for the same service stay separate lines.
const lineKey = (size?: string | null, startsAt?: string | null) => `${sizeKey(size)}|${startsAt ?? ""}`;

type StoreApi = ReturnType<typeof createCartStore>;

function createCartStore(storeId: string) {
  return create<CartStore>()(
    persist(
      (set) => ({
        items: [],
        storeId,

        addItem: (newItem) => {
          // PostgreSQL returns NUMERIC as strings — coerce to numbers at the point of entry
          const item = {
            ...newItem,
            price: Number(newItem.price),
            stock_quantity: Number(newItem.stock_quantity),
          };
          set((state) => {
            const existing = state.items.find(
              (i) => i.product_id === item.product_id && lineKey(i.size, i.booking?.startsAt) === lineKey(item.size, item.booking?.startsAt)
            );
            // A booked slot can only be in the cart once
            if (existing && item.booking) return state;
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.product_id === item.product_id && lineKey(i.size, i.booking?.startsAt) === lineKey(item.size, item.booking?.startsAt)
                    ? { ...i, quantity: Math.min(i.quantity + 1, item.stock_quantity) }
                    : i
                ),
              };
            }
            return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] };
          });
        },

        removeItem: (productId, size, startsAt) => {
          set((state) => ({
            items: state.items.filter(
              (i) => !(i.product_id === productId && lineKey(i.size, i.booking?.startsAt) === lineKey(size, startsAt))
            ),
          }));
        },

        updateQuantity: (productId, qty, size) => {
          if (qty <= 0) {
            set((state) => ({
              items: state.items.filter(
                (i) => !(i.product_id === productId && sizeKey(i.size) === sizeKey(size))
              ),
            }));
          } else {
            set((state) => ({
              items: state.items.map((i) =>
                i.product_id === productId && sizeKey(i.size) === sizeKey(size)
                  ? { ...i, quantity: Math.min(qty, i.stock_quantity) }
                  : i
              ),
            }));
          }
        },

        clearCart: () => set({ items: [] }),
      }),
      {
        name: `cart-${storeId}`,
        // Only the lines are saved. (Totals used to live in the store as
        // getters; restoring a saved cart copied them before the store
        // existed, which threw and silently dropped the whole cart on every
        // refresh. useCart computes totals instead.)
        partialize: (s) => ({ items: s.items }),
        merge: (persisted, current) => ({ ...current, items: savedItems(persisted) }),
      }
    )
  );
}

/** Cart lines from storage, skipping anything malformed. */
function savedItems(persisted: unknown): CartItem[] {
  const items = (persisted as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is CartItem => !!i && typeof i === "object" && typeof (i as CartItem).product_id === "string" && Number((i as CartItem).quantity) > 0)
    .map((i) => ({ ...i, price: Number(i.price), quantity: Number(i.quantity), stock_quantity: Number(i.stock_quantity) }));
}

type CartContextValue = { storeApi: StoreApi; storeId: string };
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  const state = useStore(ctx.storeApi);
  const totalItems = state.items.reduce((sum, i) => sum + Number(i.quantity), 0);
  const totalAmount = state.items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
  return { ...state, totalItems, totalAmount };
}

export default function CartProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  // One cart per store, created once per storeId. If this provider is ever
  // reused for a different store, it switches to that store's own cart
  // rather than carrying the previous shop's items over.
  const storeRef = useRef<{ id: string; api: StoreApi } | null>(null);
  if (!storeRef.current || storeRef.current.id !== storeId) {
    storeRef.current = { id: storeId, api: createCartStore(storeId) };
  }
  const api = storeRef.current.api;

  // Another tab changed this store's cart: pick it up here too
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `cart-${storeId}`) void api.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [api, storeId]);

  return (
    <CartContext.Provider value={{ storeApi: storeRef.current.api, storeId }}>
      {children}
    </CartContext.Provider>
  );
}
