import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      {
        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300': variant === 'default',
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': variant === 'success',
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': variant === 'warning',
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': variant === 'info',
        'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400': variant === 'outline',
      },
      className
    )}>
      {children}
    </span>
  )
}
