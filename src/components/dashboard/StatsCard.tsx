import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title:     string
  value:     string | number
  change?:   string
  icon?:     LucideIcon
  positive?: boolean
  className?: string
}

export function StatsCard({ title, value, change, icon: Icon, positive, className }: StatsCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium',
              positive ? 'text-emerald-600' : 'text-red-500'
            )}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-2.5">
            <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
        )}
      </div>
    </div>
  )
}
