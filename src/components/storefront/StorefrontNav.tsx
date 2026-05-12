'use client'
import { useState } from 'react'
import { Menu, ShoppingCart, X, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { CartDrawer } from './CartDrawer'
import { MenuDrawer } from './MenuDrawer'
import type { Store, Category } from '@/types'

interface StorefrontNavProps {
  store:      Store
  categories: Category[]
}

export function StorefrontNav({ store, categories }: StorefrontNavProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems } = useCart(store.id)

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 h-16"
        style={{ background: 'var(--sf-bg)', borderBottom: '1px solid var(--sf-border)' }}
      >
        <div className="flex h-full items-center justify-between px-4 max-w-5xl mx-auto">
          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--sf-text)' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link href={`/store/${store.slug}`} className="absolute left-1/2 -translate-x-1/2">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={100}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="font-bold text-lg" style={{ color: 'var(--sf-text)' }}>
                {store.name}
              </span>
            )}
          </Link>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-xl transition-colors"
            style={{ color: 'var(--sf-text)' }}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: 'var(--sf-accent)', color: '#000' }}
              >
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        store={store}
        categories={categories}
      />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
      />
    </>
  )
}
