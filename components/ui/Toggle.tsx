'use client'
import { cn } from '@/lib/utils'

interface ToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-9 h-5 rounded-full border-0 transition-colors duration-200 flex-shrink-0',
        value ? 'bg-green-600' : 'bg-[#dddbd5]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
        value ? 'left-[18px]' : 'left-0.5'
      )} />
    </button>
  )
}
