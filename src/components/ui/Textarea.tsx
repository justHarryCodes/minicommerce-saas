'use client'
import { cn } from '@/lib/utils'
import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={4}
          className={cn(
            'w-full rounded-xl border px-4 py-2.5 bg-white dark:bg-zinc-900',
            'text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600',
            'transition-colors duration-150 resize-none',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-zinc-200 dark:border-zinc-700 focus:ring-brand-400 focus:border-brand-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
