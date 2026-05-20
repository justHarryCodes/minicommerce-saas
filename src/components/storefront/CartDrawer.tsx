'use client';
import { X, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useCart } from './CartProvider';
import { useStore } from '@/lib/store-context';
import { formatPrice, getStoreUrl, waLink } from '@/lib/utils';
import type { Store } from '@/types';
import Link from 'next/link';

interface CartDrawerProps {
  isOpen:  boolean;
  onClose: () => void;
  store:   Store;
}

export function CartDrawer({ isOpen, onClose, store }: CartDrawerProps) {
  const { items, totalItems, totalAmount: totalPrice, updateQuantity, removeItem } = useCart();
  const { storeBase } = useStore();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--sf-bg)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--sf-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" style={{ color: 'var(--sf-text)' }} />
            <span className="font-bold text-base" style={{ color: 'var(--sf-text)' }}>
              Your cart
            </span>
            {totalItems > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-black"
                style={{ background: 'var(--sf-accent)', color: '#000' }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close cart"
            style={{ color: 'var(--sf-muted)' }}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--sf-surface)' }}
              >
                <ShoppingBag className="h-7 w-7" style={{ color: 'var(--sf-muted)' }} />
              </div>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: 'var(--sf-text)' }}>
                  Your cart is empty
                </p>
                <p className="text-xs" style={{ color: 'var(--sf-muted)' }}>
                  Add items to get started
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product_id}
                className="flex gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--sf-surface)' }}
              >
                {/* Image */}
                {item.image_url ? (
                  <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-16 w-16 rounded-xl shrink-0 flex items-center justify-center text-xl"
                    style={{ background: 'var(--sf-border)' }}
                  >
                    🛍️
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-semibold truncate leading-snug"
                    style={{ color: 'var(--sf-text)' }}
                  >
                    {item.name}
                  </p>
                  <p className="text-sm font-black mt-0.5" style={{ color: 'var(--sf-accent)' }}>
                    {formatPrice(item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ border: '1.5px solid var(--sf-border)', color: 'var(--sf-text)' }}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center" style={{ color: 'var(--sf-text)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'var(--sf-accent)', color: '#000' }}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Right: total + remove */}
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                    style={{ color: 'var(--sf-muted)' }}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-sm font-bold" style={{ color: 'var(--sf-text)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="p-4 space-y-3 border-t"
            style={{ borderColor: 'var(--sf-border)' }}
          >
            {/* Totals row */}
            <div
              className="flex items-center justify-between px-1 py-2 rounded-xl"
            >
              <span className="text-sm font-medium" style={{ color: 'var(--sf-muted)' }}>
                Total ({totalItems} item{totalItems !== 1 ? 's' : ''})
              </span>
              <span className="text-xl font-black" style={{ color: 'var(--sf-text)' }}>
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Checkout */}
            <Link
              href={`${storeBase}/checkout`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
              style={{ background: 'var(--sf-accent)', color: '#000' }}
            >
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>

            {/* WhatsApp */}
            {store.whatsapp && (() => {
              const wa = store.whatsapp as string;
              const storeUrl = getStoreUrl(store.slug);
              const itemLines = items
                .map((it) => `• ${it.name} × ${it.quantity} — ${formatPrice(it.price * it.quantity)}`)
                .join('\n');
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
              ].join('\n');
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
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}

export default CartDrawer;
