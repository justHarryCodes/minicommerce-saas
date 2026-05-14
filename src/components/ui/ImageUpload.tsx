'use client'
import { useState, useRef } from 'react'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clLogo } from '@/lib/cloudinary'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  className?: string
  label?: string
}

export function ImageUpload({ value, onChange, onRemove, className, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Only image files allowed'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</p>}

      {value ? (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <img src={clLogo(value)} alt="Upload" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { onRemove?.(); onChange('') }}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label className={cn(
          'flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          uploading
            ? 'border-accent-300 bg-accent-50'
            : 'border-surface-200 dark:border-surface-700 hover:border-accent-400 hover:bg-surface-50 dark:hover:bg-surface-800'
        )}>
          {uploading ? (
            <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-surface-300 mb-1" />
              <span className="text-xs text-surface-400 text-center px-2">Click to upload</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </label>
      )}
    </div>
  )
}
