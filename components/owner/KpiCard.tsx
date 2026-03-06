import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  change?: string
  changePositive?: boolean
  period?: string
  target?: number      // nilai target (angka)
  current?: number     // nilai sekarang (angka, untuk progress)
  targetLabel?: string // label satuan target, e.g. "Rp2.000.000"
}

export function KpiCard({ label, value, change, changePositive, period, target, current, targetLabel }: Props) {
  const pct = target && current !== undefined ? Math.min(100, Math.round(current / target * 100)) : null

  return (
    <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
      <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-extrabold text-[#0d0d0d] tracking-tight mt-1.5 leading-none">{value}</div>

      {change && (
        <div className={cn(
          'inline-flex items-center gap-1 mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full',
          changePositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {changePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {change} {period && `vs ${period}`}
        </div>
      )}

      {pct !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#8a8a8a]">Target: {targetLabel}</span>
            <span className={`text-[10px] font-bold ${pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-[#8a8a8a]'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 bg-[#eceae6] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-[#d4510c]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}