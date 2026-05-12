import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?:        LucideIcon
  title:        string
  description?: string
  action?:      React.ReactNode
  className?:   string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-8 w-8 text-zinc-400" />
        </div>
      )}
      <h3 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
      {description && <p className="mb-6 max-w-xs text-sm text-zinc-500">{description}</p>}
      {action}
    </div>
  )
}
