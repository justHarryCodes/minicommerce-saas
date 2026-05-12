import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('inline-block h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin', className)} />
  )
}
