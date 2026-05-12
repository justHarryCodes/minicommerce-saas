"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, ShoppingCart, X, ChevronRight } from "lucide-react";
import { useCart } from "./CartProvider";
import CartDrawer from "./CartDrawer";
import type { Store, Category } from "@/types";

interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

interface Props {
  store: Store;
  categories: CategoryWithSubs[];
}

export default function StorefrontNav({ store, categories }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <>
      {/* Fixed nav bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800 flex items-center"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div className="max-w-6xl mx-auto w-full px-4 flex items-center justify-between">
          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Center: Store logo */}
          <Link href={`/store/${store.slug}`} className="absolute left-1/2 -translate-x-1/2">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={120}
                height={40}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <span className="font-black text-lg text-surface-900 dark:text-white tracking-tight">
                {store.name}
              </span>
            )}
          </Link>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 -mr-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ─── Menu drawer (left slide-in) ────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-surface-900 shadow-2xl animate-slide-in-left overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-3">
                {store.logo_url ? (
                  <Image
                    src={store.logo_url}
                    alt={store.name}
                    width={80}
                    height={32}
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="font-black text-lg text-surface-900 dark:text-white">
                    {store.name}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="p-4">
              <Link
                href={`/store/${store.slug}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-surface-900 dark:text-white hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                🏠 All Products
              </Link>

              {categories.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-2">
                    Shop by category
                  </p>
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <Link
                        href={`/store/${store.slug}?category=${cat.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-800 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                        {cat.name}
                      </Link>
                      {cat.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/store/${store.slug}?category=${cat.slug}&sub=${sub.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 pl-8 pr-3 py-2 rounded-xl text-sm text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </nav>

            {/* Store contact */}
            {(store.phone || store.whatsapp) && (
              <div className="p-5 border-t border-surface-100 dark:border-surface-800">
                <p className="text-xs text-surface-400 font-medium mb-3">Contact us</p>
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium"
                  >
                    <span>💬</span> WhatsApp
                  </a>
                )}
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 mt-2"
                  >
                    <span>📞</span> {store.phone}
                  </a>
                )}
              </div>
            )}
          </aside>
        </>
      )}

      {/* ─── Cart drawer ─────────────────────────────────────────────────────── */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
      />
    </>
  );
}
