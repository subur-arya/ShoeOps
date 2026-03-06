import { cn } from '@/lib/utils'
import { DEFAULT_ORDER_STATUSES } from '@/lib/api'
import type { OrderStatusConfig } from '@/lib/api'

interface Props {
  status: string
  size?: 'sm' | 'md'
  statuses?: OrderStatusConfig[]
}

export function StatusBadge({ status, size = 'md', statuses }: Props) {
  const steps: any[] = (statuses && statuses.length > 0) ? statuses : DEFAULT_ORDER_STATUSES
  const cfg = steps.find(s => s.key === status) ?? steps[0]
  const color = cfg?.color ?? '#8a8a8a'

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-bold rounded-full',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1.5'
    )} style={{ backgroundColor: color + '18', color }}>
      <span className={cn('rounded-full flex-shrink-0', size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5')}
        style={{ backgroundColor: color }} />
      {cfg?.icon && <span>{cfg.icon}</span>}
      {cfg?.label ?? status}
    </span>
  )
}