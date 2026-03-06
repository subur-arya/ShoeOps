import { cn } from '@/lib/utils'
import { DEFAULT_ORDER_STATUSES } from '@/lib/api'
import type { OrderStatusConfig } from '@/lib/api'

interface Props {
  status: string
  size?: 'sm' | 'md'
  statuses?: OrderStatusConfig[]
}

export function OrderTimeline({ status, size = 'md', statuses }: Props) {
  const steps: any[] = (statuses && statuses.length > 0) ? statuses : DEFAULT_ORDER_STATUSES
  let currentIdx = steps.findIndex(s => s.key === status)
  // Kalau status tidak ditemukan di steps (misal data lama), anggap step pertama
  if (currentIdx === -1) currentIdx = 0
  const small = size === 'sm'

  return (
    <div className="flex items-start w-full overflow-x-auto">
      <div className="flex items-start w-full min-w-0">
        {steps.map((s: any, i: number) => {
          const done  = i < currentIdx
          const cur   = i === currentIdx
          const color = s.color ?? '#d4510c'
          return (
            <div key={s.key ?? i} className="flex-1 min-w-[48px] flex flex-col items-center relative">
              {i < steps.length - 1 && (
                <div className={cn('absolute left-1/2 right-[-50%] h-0.5 z-0', small ? 'top-[8px]' : 'top-[11px]')}
                  style={{ backgroundColor: (done || cur) ? color : '#dddbd5' }} />
              )}
              <div className={cn('relative z-10 rounded-full border-2 flex items-center justify-center flex-shrink-0', small ? 'w-4 h-4' : 'w-[22px] h-[22px]')}
                style={{ borderColor: (done || cur) ? color : '#dddbd5', backgroundColor: done ? color : 'white', boxShadow: cur ? `0 0 0 3px ${color}22` : undefined }}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : cur ? (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                ) : (
                  <span className={cn('rounded-full bg-[#dddbd5]', small ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
                )}
              </div>
              <span className={cn('mt-1.5 text-center leading-tight px-0.5', small ? 'text-[9px]' : 'text-[10px]', done ? 'text-[#0d0d0d] font-semibold' : cur ? 'font-bold' : 'text-[#8a8a8a] font-medium')}
                style={cur ? { color } : {}}>
                {!small && s.icon ? `${s.icon} ` : ''}{s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}