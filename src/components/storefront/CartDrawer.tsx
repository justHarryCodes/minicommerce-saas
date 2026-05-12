'use client'
import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { Store } from '@/types'
import Link from 'next/link'

interface CartDrawerProps {
  isOpen:  boolean
  onClose: () => void
  store:   Store
}

export function CartDrawer({ isOpen, onClose, store }: CartDrawerProps) {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart(store.id)

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--sf-bg)', color: 'var(--sf-text)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--sf-border)' }}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="font-bold text-lg">Cart</span>
            {totalItems > 0 && (
              <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: 'var(--sf-accent)', color: '#000' }}>
                {totalItems}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--sf-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <ShoppingBag className="h-12 w-12" style={{ color: 'var(--sf-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--sf-muted)' }}>Your cart is empty</p>
            </div>
          ) : items.map(item => (
            <div key={item.product_id} className="flex gap-3">
              {item.image_url ? (
                <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0">
                  <Image src={item.image_url} alt={item.name} width={64} height={64} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--sf-surface)' }}>
                  <ShoppingBag className="h-6 w-6" style={{ color: 'var(--sf-muted)' }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--sf-accent)' }}>
                  {formatPrice(item.price)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--sf-border)' }}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--sf-border)', background: 'var(--sf-accent)', color: '#000' }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.product_id)} style={{ color: 'var(--sf-muted)' }}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t space-y-3" style={{ borderColor: 'var(--sf-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--sf-muted)' }}>Total</span>
              <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
            </div>
            <Link
              href={`/store/${store.slug}/checkout`}
              onClick={onClose}
              className="block w-full py-3.5 rounded-xl text-center font-bold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--sf-accent)', color: '#000' }}
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

export default CartDrawer
