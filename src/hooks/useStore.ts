'use client'
import { useState, useEffect } from 'react'
import type { Store } from '@/types'

export function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stores')
      .then(r => r.json())
      .then(({ data }) => setStore(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { store, loading }
}
