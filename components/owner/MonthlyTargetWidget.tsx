import { TrendingUp, ShoppingBag, Users, DollarSign, CheckCircle2 } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface TargetItem {
  label:    string
  icon:     React.ReactNode
  current:  number
  target:   number
  format:   (n: number) => string
  color:    string
  bgColor:  string
}

interface Props {
  revenueMonth:  number
  targetBulanan: number
  pesananMonth:  number
  targetPesanan: number
  customerMonth: number
  targetCustomer: number
  daysLeft:      number
  daysInMonth:   number
}

function TargetBar({ item }: { item: TargetItem }) {
  const hasTarget = item.target > 0
  const pct       = hasTarget ? Math.min(100, Math.round(item.current / item.target * 100)) : 0
  const done      = pct >= 100

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[#525252]">{item.icon}</span>
          <span className="text-[11px] font-semibold text-[#525252]">{item.label}</span>
        </div>
        {done ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
            <CheckCircle2 size={11} /> Tercapai!
          </span>
        ) : hasTarget ? (
          <span className="text-[10px] font-bold" style={{ color: item.color }}>{pct}%</span>
        ) : (
          <span className="text-[10px] text-[#c0bdb8]">Belum diset</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[#eceae6] rounded-full overflow-hidden">
          {hasTarget && (
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: done ? '#16a34a' : item.color }}
            />
          )}
        </div>
        <span className="text-[10px] text-[#8a8a8a] whitespace-nowrap flex-shrink-0">
          {item.format(item.current)}
          {hasTarget && <span className="text-[#c0bdb8]"> / {item.format(item.target)}</span>}
        </span>
      </div>
    </div>
  )
}

export function MonthlyTargetWidget({
  revenueMonth, targetBulanan,
  pesananMonth, targetPesanan,
  customerMonth, targetCustomer,
  daysLeft, daysInMonth,
}: Props) {
  const targets: TargetItem[] = [
    {
      label:    'Pendapatan',
      icon:     <DollarSign size={12} />,
      current:  revenueMonth,
      target:   targetBulanan,
      format:   n => n >= 1_000_000 ? `Rp${(n/1_000_000).toFixed(1)}jt` : n >= 1000 ? `Rp${(n/1000).toFixed(0)}rb` : formatRupiah(n),
      color:    '#d4510c',
      bgColor:  '#fdf0ea',
    },
    {
      label:    'Pesanan',
      icon:     <ShoppingBag size={12} />,
      current:  pesananMonth,
      target:   targetPesanan,
      format:   n => `${n} order`,
      color:    '#2563eb',
      bgColor:  '#eff6ff',
    },
    {
      label:    'Customer',
      icon:     <Users size={12} />,
      current:  customerMonth,
      target:   targetCustomer,
      format:   n => `${n} orang`,
      color:    '#7c3aed',
      bgColor:  '#f5f3ff',
    },
  ]

  const allSet     = targets.every(t => t.target > 0)
  const allDone    = allSet && targets.every(t => t.current >= t.target)
  const anySet     = targets.some(t => t.target > 0)
  const dayPct     = Math.round(((daysInMonth - daysLeft) / daysInMonth) * 100)

  // Proyeksi pendapatan akhir bulan
  const daysPassed = daysInMonth - daysLeft
  const projRevenue = daysPassed > 0
    ? Math.round(revenueMonth / daysPassed * daysInMonth)
    : 0

  return (
    <div className={`bg-white rounded-2xl border-[1.5px] p-4 shadow-sm ${allDone ? 'border-green-300' : 'border-[#dddbd5]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#fdf0ea] flex items-center justify-center">
            <TrendingUp size={14} className="text-[#d4510c]" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#0d0d0d]">Target Bulan Ini</p>
            <p className="text-[10px] text-[#8a8a8a]">{daysLeft} hari lagi tersisa</p>
          </div>
        </div>
        {allDone && (
          <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
            🎉 Semua tercapai!
          </span>
        )}
        {!anySet && (
          <span className="text-[10px] text-[#c0bdb8] italic">Target belum diset</span>
        )}
      </div>

      {/* Progress waktu bulan */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#8a8a8a]">Progress bulan</span>
          <span className="text-[10px] font-bold text-[#525252]">{dayPct}% hari terlewati</span>
        </div>
        <div className="h-1 bg-[#eceae6] rounded-full overflow-hidden">
          <div className="h-full bg-[#dddbd5] rounded-full" style={{ width: `${dayPct}%` }} />
        </div>
      </div>

      {/* Target bars */}
      <div className="space-y-3">
        {targets.map(t => <TargetBar key={t.label} item={t} />)}
      </div>

      {/* Proyeksi */}
      {projRevenue > 0 && targetBulanan > 0 && (
        <div className="mt-3 pt-3 border-t border-[#eceae6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8a8a8a]">Proyeksi akhir bulan</span>
            <span className={`text-[11px] font-bold ${projRevenue >= targetBulanan ? 'text-green-600' : 'text-amber-600'}`}>
              {projRevenue >= 1_000_000
                ? `Rp${(projRevenue/1_000_000).toFixed(1)}jt`
                : `Rp${(projRevenue/1000).toFixed(0)}rb`}
              {projRevenue >= targetBulanan ? ' ✓' : ' ⚠'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}