'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-in',
      type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'
    )}>
      {type === 'success'
        ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
        : <XCircle size={16} className="text-red-600 flex-shrink-0" />
      }
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const show = (message: string, type: ToastType = 'success') => setToast({ message, type })
  const hide = () => setToast(null)
  return { toast, show, hide }
}
