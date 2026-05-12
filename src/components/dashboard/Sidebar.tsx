'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag,
  Settings, Palette, LogOut, Store, ChevronRight
} from 'lucide-react'
import { auth } from '@/lib/firebase-client'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const navItems = [
  { href: '/dashboard',           label: 'Overview',    icon: LayoutDashboard },
  { href: '/dashboard/products',  label: 'Products',    icon: Package },
  { href: '/dashboard/categories',label: 'Categories',  icon: FolderTree },
  { href: '/dashboard/orders',    label: 'Orders',      icon: ShoppingBag },
  { href: '/dashboard/themes',    label: 'Theme',       icon: Palette },
  { href: '/dashboard/settings',  label: 'Settings',    icon: Settings },
]

interface SidebarProps {
  store?: { name: string; slug: string; logoUrl?: string }
}

export function Sidebar({ store }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="h-8 w-8 rounded-xl bg-brand-400 flex items-center justify-center">
          <Store className="h-4 w-4 text-zinc-900" />
        </div>
        <span className="font-bold text-zinc-900 dark:text-white tracking-tight">Storely</span>
      </div>

      {/* Store info */}
      {store && (
        <div className="mx-4 mt-4 mb-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 px-3 py-2.5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Your store</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{store.name}</p>
            <a
              href={`/store/${store.slug}`}
              target="_blank"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 shrink-0"
            >
              View <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 pt-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-brand-400 text-zinc-900 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
