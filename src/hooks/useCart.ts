'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CartItem } from '@/types'

const CART_KEY = (storeId: string) => `cart_${storeId}`

export function useCart(storeId: string) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY(storeId))
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [storeId])

  const persist = (newItems: CartItem[]) => {
    setItems(newItems)
    try { localStorage.setItem(CART_KEY(storeId), JSON.stringify(newItems)) } catch {}
  }

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      let next: CartItem[]
      if (existing) {
        const newQty = Math.min(existing.quantity + item.quantity, existing.stock_quantity)
        next = prev.map(i => i.product_id === item.product_id ? { ...i, quantity: newQty } : i)
      } else {
        next = [...prev, item]
      }
      try { localStorage.setItem(CART_KEY(storeId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [storeId])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(prev => {
      const next = quantity <= 0
        ? prev.filter(i => i.product_id !== productId)
        : prev.map(i => i.product_id === productId
            ? { ...i, quantity: Math.min(quantity, i.stock_quantity) }
            : i)
      try { localStorage.setItem(CART_KEY(storeId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [storeId])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.product_id !== productId)
      try { localStorage.setItem(CART_KEY(storeId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [storeId])

  const clearCart = useCallback(() => {
    setItems([])
    try { localStorage.removeItem(CART_KEY(storeId)) } catch {}
  }, [storeId])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return { items, totalItems, totalPrice, addItem, updateQuantity, removeItem, clearCart }
}
