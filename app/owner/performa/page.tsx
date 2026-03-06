'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/utils'
import { fetchOrders, fetchTreatments, fetchCustomers, fetchDiscounts } from '@/lib/api'
import type { OrderWithDetails } from '@/types'
import { TrendingUp, TrendingDown, Minus, Target, Award, Zap } from 'lucide-react'
import { subDays, startOfWeek, format, eachDayOfInterval, differenceInDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function PerformaPage() {
  const [orders,    setOrders]    = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [treats,    setTreats]    = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [discounts, setDiscounts] = useState<any[]>([])
  const [target,    setTarget]    = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('shoeops_daily_target') || '1000000')
    }
    return 1000000
  })
  const [editTarget, setEditTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    fetchOrders().then(setOrders)
    fetchTreatments().then(setTreats)
    fetchCustomers().then(setCustomers)
    Promise.resolve(fetchDiscounts()).then(setDiscounts)
    setLoading(false)
  }, [])

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  // ── 7 hari terakhir ───────────────────────────────────
  const last7 = eachDayOfInterval({ start: subDays(now, 6), end: now })
  const dailyData = last7.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayOrders = orders.filter(o => o.created_at.startsWith(dayStr))
    const revenue = dayOrders.reduce((s, o) => s + o.total_price, 0)
    const isToday = dayStr === today
    return {
      date: dayStr,
      label: format(day, 'EEE', { locale: localeId }),
      orders: dayOrders.length,
      revenue,
      isToday,
      hitTarget: revenue >= target,
    }
  })

  const maxRev = Math.max(...dailyData.map(d => d.revenue), target)
  const todayData = dailyData.find(d => d.isToday)!
  const yesterdayData = dailyData[dailyData.length - 2]

  // ── Tren ───────────────────────────────────────────────
  function trend(cur: number, prev: number) {
    if (!prev) return { dir: 'up' as const, pct: 0 }
    const pct = Math.round((cur - prev) / prev * 100)
    return { dir: pct >= 0 ? 'up' as const : 'down' as const, pct: Math.abs(pct) }
  }
  const revTrend = trend(todayData?.revenue || 0, yesterdayData?.revenue || 0)
  const ordTrend = trend(todayData?.orders || 0, yesterdayData?.orders || 0)

  // ── Best day & worst day ──────────────────────────────
  const sorted = [...dailyData].sort((a, b) => b.revenue - a.revenue)
  const bestDay  = sorted[0]
  const worstDay = sorted[sorted.length - 1]

  // ── Treatment harian ──────────────────────────────────
  const todayOrders = orders.filter(o => o.created_at.startsWith(today))
  const treatToday = treats.map(t => {
    const cnt = todayOrders.filter(o => o.order_items?.some(i => i.treatment_id === t.id)).length
    return { ...t, count: cnt }
  }).filter(t => t.count > 0).sort((a, b) => b.count - a.count)

  // ── Promo usage ───────────────────────────────────────
  const activeDiscounts = discounts.filter(d => d.active)
  const totalPromoUsed  = discounts.reduce((s: number, d: any) => s + d.usedCount, 0)

  // ── Customer baru hari ini ─────────────────────────────
  const newCustomersToday = customers.filter(c => c.created_at?.startsWith(today)).length

  // ── Conversion: customer yg datang lagi ──────────────
  const returnCustomers = todayOrders.filter(o => {
    const c = customers.find((x: any) => x.id === o.customer_id)
    return c && c.total_orders > 1
  }).length

  // ── Jam performa (dari data REAL order hari ini) ──────
  const hourStats = Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
    const cnt = todayOrders.filter(o => {
      const hour = new Date(o.created_at).getHours()
      return hour === h
    }).length
    return { h: `${h < 10 ? '0' : ''}${h}:00`, cnt }
  })
  const maxHour = Math.max(...hourStats.map(h => h.cnt), 1)
  const peakHour = hourStats.reduce((best, h) => h.cnt > best.cnt ? h : best, hourStats[0])

  function saveTarget() {
    const val = parseInt(targetInput)
    if (val > 0) {
      localStorage.setItem('shoeops_daily_target', String(val))
      setTarget(val)
    }
    setEditTarget(false)
  }

  const pctOfTarget = target > 0 ? Math.min(100, Math.round((todayData?.revenue || 0) / target * 100)) : 0

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Performa Toko</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">Analisis harian & mingguan secara real-time</p>
      </div>

      {/* Target harian */}
      <div className="bg-[#0d0d0d] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#e8784a]" />
            <span className="text-sm font-bold text-white/60">Target Harian</span>
          </div>
          {editTarget ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Rp</span>
              <input value={targetInput} onChange={e => setTargetInput(e.target.value)} type="number"
                className="w-28 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white outline-none"
                autoFocus onKeyDown={e => e.key === 'Enter' && saveTarget()} />
              <button onClick={saveTarget} className="px-3 py-1.5 bg-[#d4510c] text-white text-xs font-bold rounded-lg">Simpan</button>
              <button onClick={() => setEditTarget(false)} className="px-2 py-1.5 text-white/40 text-xs hover:text-white">✕</button>
            </div>
          ) : (
            <button onClick={() => { setEditTarget(true); setTargetInput(String(target)) }}
              className="text-xs font-bold text-white/40 hover:text-white transition-colors">Ubah Target →</button>
          )}
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-white">{formatRupiah(todayData?.revenue || 0)}</p>
            <p className="text-xs text-white/40 mt-1">dari target {formatRupiah(target)}</p>
          </div>
          <span className={`text-2xl font-extrabold ${pctOfTarget >= 100 ? 'text-green-400' : pctOfTarget >= 70 ? 'text-[#e8784a]' : 'text-white/60'}`}>
            {pctOfTarget}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pctOfTarget >= 100 ? 'bg-green-400' : 'bg-[#d4510c]'}`}
            style={{ width: `${pctOfTarget}%` }} />
        </div>

        {pctOfTarget >= 100 && (
          <p className="text-xs font-bold text-green-400 mt-2 flex items-center gap-1.5">
            <Zap size={11} /> Target tercapai hari ini! Luar biasa 🎉
          </p>
        )}
      </div>

      {/* Stats hari ini */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Pesanan Hari Ini', v: String(todayData?.orders || 0), trend: ordTrend, sub: `vs ${yesterdayData?.orders || 0} kemarin` },
          { l: 'Revenue Hari Ini', v: formatRupiah(todayData?.revenue || 0), trend: revTrend, sub: `vs ${formatRupiah(yesterdayData?.revenue || 0)}` },
          { l: 'Customer Baru',   v: String(newCustomersToday), trend: null, sub: 'hari ini' },
          { l: 'Customer Balik', v: String(returnCustomers), trend: null, sub: `dari ${todayData?.orders || 0} pesanan` },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{s.l}</div>
            <div className="text-2xl font-extrabold tracking-tight text-[#0d0d0d] mt-1.5">{s.v}</div>
            {s.trend && (
              <div className={`flex items-center gap-1 mt-1 text-[11px] font-bold ${s.trend.dir === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {s.trend.dir === 'up' ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                {s.trend.pct > 0 ? `${s.trend.pct}%` : 'Sama'} {s.trend.dir === 'up' ? 'naik' : 'turun'}
              </div>
            )}
            {!s.trend && <div className="text-xs text-[#8a8a8a] mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Chart 7 hari */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#0d0d0d]">Revenue 7 Hari Terakhir</h2>
            <p className="text-[11px] text-[#8a8a8a] mt-0.5">Garis merah = target harian</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#8a8a8a]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-[#d4510c] rounded-full inline-block"/>{formatRupiah(dailyData.reduce((s,d) => s+d.revenue,0))} total</span>
          </div>
        </div>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {dailyData.map((d, i) => {
            const h = maxRev > 0 ? Math.max(4, Math.round(d.revenue / maxRev * 108)) : 4
            const targetH = Math.round(target / maxRev * 108)
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 relative">
                {/* Target line */}
                <div className="absolute w-full border-t border-dashed border-red-300" style={{ bottom: targetH + 20 }} />
                <div className="w-full flex flex-col justify-end" style={{ height: 108 }}>
                  <div className={`w-full rounded-t-lg transition-all ${d.isToday ? 'bg-[#d4510c]' : d.hitTarget ? 'bg-green-400' : 'bg-[#eceae6]'}`}
                    style={{ height: h }} title={`${formatRupiah(d.revenue)}`} />
                </div>
                <span className={`text-[9px] font-bold ${d.isToday ? 'text-[#d4510c]' : 'text-[#8a8a8a]'}`}>{d.label}</span>
                <span className="text-[8px] text-[#8a8a8a]">{d.orders}x</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-[#eceae6] flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]"><span className="w-3 h-3 bg-[#d4510c] rounded inline-block"/>Hari ini</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]"><span className="w-3 h-3 bg-green-400 rounded inline-block"/>Capai target</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]"><span className="w-3 h-3 bg-[#eceae6] rounded inline-block"/>Di bawah target</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]"><span className="w-3 border-t border-dashed border-red-300 inline-block"/>Garis target</span>
        </div>
      </div>

      {/* Best/worst + treatment hari ini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Best & worst day */}
        <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-4">Hari Terbaik & Terlemah (7 Hari)</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
              <Award size={18} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Terbaik</p>
                <p className="text-sm font-bold text-[#0d0d0d]">{bestDay.label} — {formatRupiah(bestDay.revenue)}</p>
                <p className="text-xs text-[#8a8a8a]">{bestDay.orders} pesanan</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f5f4f1] border border-[#eceae6] rounded-xl">
              <Minus size={18} className="text-[#8a8a8a] flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Paling Sepi</p>
                <p className="text-sm font-bold text-[#0d0d0d]">{worstDay.label} — {formatRupiah(worstDay.revenue)}</p>
                <p className="text-xs text-[#8a8a8a]">{worstDay.orders} pesanan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Treatment hari ini */}
        <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-4">Treatment Dipesan Hari Ini</h2>
          {treatToday.length === 0 ? (
            <p className="text-sm text-[#8a8a8a] py-4 text-center">Belum ada pesanan hari ini.</p>
          ) : (
            <div className="space-y-2">
              {treatToday.map((t: any, i: number) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${i === 0 ? 'bg-[#fef9e7] text-[#92600a]' : 'bg-[#f5f4f1] text-[#8a8a8a]'}`}>{i+1}</span>
                  <span className="flex-1 text-sm font-semibold text-[#0d0d0d] truncate">{t.name}</span>
                  <span className="text-sm font-bold text-[#d4510c]">{t.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Jam tersibuk hari ini + promo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Jam tersibuk */}
        <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-4">Distribusi Pesanan per Jam (Hari Ini)</h2>
          {todayOrders.length === 0 ? (
            <p className="text-sm text-[#8a8a8a] py-4 text-center">Belum ada pesanan hari ini.</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 72 }}>
                {hourStats.map(h => {
                  const pct = h.cnt / maxHour
                  return (
                    <div key={h.h} className="flex-1 flex flex-col items-center gap-1" style={{ height: 72 }}>
                      <div className="w-full flex flex-col justify-end" style={{ height: 60 }}>
                        <div className={`w-full rounded-t-sm ${h.cnt === maxHour && h.cnt > 0 ? 'bg-[#d4510c]' : h.cnt > 0 ? 'bg-[#eceae6]' : 'bg-transparent'}`}
                          style={{ height: Math.max(0, pct * 56) }} />
                      </div>
                      <span className="text-[8px] text-[#8a8a8a]">{h.h.slice(0,2)}</span>
                    </div>
                  )
                })}
              </div>
              {peakHour.cnt > 0 && (
                <p className="text-xs text-[#8a8a8a] mt-3 pt-3 border-t border-[#eceae6]">
                  Jam paling ramai: <strong className="text-[#0d0d0d]">{peakHour.h}</strong> ({peakHour.cnt} pesanan)
                </p>
              )}
            </>
          )}
        </div>

        {/* Ringkasan promo */}
        <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-4">Ringkasan Promo</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { l: 'Promo Aktif',      v: String(activeDiscounts.length),    c: '' },
              { l: 'Total Digunakan',  v: `${totalPromoUsed}x`,              c: 'text-[#d4510c]' },
            ].map(m => (
              <div key={m.l} className="bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6]">
                <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">{m.l}</p>
                <p className={`text-xl font-extrabold tracking-tight mt-1 ${m.c}`}>{m.v}</p>
              </div>
            ))}
          </div>
          {activeDiscounts.length > 0 ? (
            <div className="space-y-0 divide-y divide-[#eceae6]">
              {activeDiscounts.slice(0, 4).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-xs font-bold text-[#d4510c] flex-1">{d.code}</span>
                  <span className="text-xs text-[#525252]">{d.type === 'pct' ? `${d.value}%` : formatRupiah(d.value)}</span>
                  <span className="text-xs text-[#8a8a8a]">{d.usedCount}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8a8a8a] text-center py-2">Belum ada promo aktif.</p>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}