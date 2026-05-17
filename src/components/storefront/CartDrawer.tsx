'use client'
import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useStore } from '@/lib/store-context'
import { formatPrice, getStoreUrl, waLink } from '@/lib/utils'
import type { Store } from '@/types'
import Link from 'next/link'

interface CartDrawerProps {
  isOpen:  boolean
  onClose: () => void
  store:   Store
}

export function CartDrawer({ isOpen, onClose, store }: CartDrawerProps) {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart(store.id)
  const { storeBase } = useStore()

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
              href={`${storeBase}/checkout`}
              onClick={onClose}
              className="block w-full py-3.5 rounded-xl text-center font-bold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--sf-accent)', color: '#000' }}
            >
              Checkout
            </Link>
            {store.whatsapp && (() => {
              const wa = store.whatsapp as string
              const storeUrl = getStoreUrl(store.slug)
              const itemLines = items.map(
                (it) => `• ${it.name} × ${it.quantity} — ${formatPrice(it.price * it.quantity)}`
              ).join('\n')
              const msg = [
                `Hello! I'd like to place an order from *${store.name}* 🛍️`,
                ``,
                itemLines,
                ``,
                `💳 *Total: ${formatPrice(totalPrice)}*`,
                ``,
                `🔗 Store: ${storeUrl}`,
                ``,
                `Please confirm availability and send payment details. Thank you! 🙏`,
              ].join('\n')
              return (
                <a
                  href={waLink(wa, msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: '#25D366', color: '#fff' }}
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.52 5.862L.057 23.743l5.994-1.573A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.652-.522-5.157-1.43l-.37-.22-3.56.933.951-3.473-.241-.381A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  Order via WhatsApp
                </a>
              )
            })()}
          </div>
        )}
      </div>
    </>
  )
}

export default CartDrawer
