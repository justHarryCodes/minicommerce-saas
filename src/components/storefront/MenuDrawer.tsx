'use client'
import { X, ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import type { Store, Category } from '@/types'
import { useState } from 'react'

interface MenuDrawerProps {
  isOpen:     boolean
  onClose:    () => void
  store:      Store
  categories: Category[]
}

export function MenuDrawer({ isOpen, onClose, store, categories }: MenuDrawerProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--sf-bg)', color: 'var(--sf-text)' }}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'var(--sf-border)' }}>
          <span className="font-bold text-lg">{store.name}</span>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--sf-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-full pb-20">
          <Link
            href={`/store/${store.slug}`}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:opacity-70"
            style={{ color: 'var(--sf-text)' }}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>

          {categories.map(cat => (
            <div key={cat.id}>
              <button
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                style={{ color: 'var(--sf-text)' }}
              >
                <span className="text-sm font-medium">{cat.name}</span>
                {cat.subcategories?.length ? (
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${expandedCat === cat.id ? 'rotate-90' : ''}`}
                    style={{ color: 'var(--sf-muted)' }}
                  />
                ) : null}
              </button>
              {expandedCat === cat.id && cat.subcategories?.map(sub => (
                <Link
                  key={sub.id}
                  href={`/store/${store.slug}?cat=${cat.slug}&sub=${sub.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2 pl-8 pr-3 py-2 rounded-xl text-sm transition-colors"
                  style={{ color: 'var(--sf-muted)' }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: 'var(--sf-muted)' }} />
                  {sub.name}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}
