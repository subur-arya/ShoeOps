'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import { formatDate, formatRupiah } from '@/lib/utils'
import { fetchOrders, fetchCustomers } from '@/lib/api'
import type { Customer, OrderWithDetails } from '@/types'
import { Search, Users, Repeat, Heart, AlertTriangle } from 'lucide-react'
import { differenceInDays } from 'date-fns'

type CustomerEnriched = Customer & {
  totalSpend: number
  lastOrderDate: string | null
  daysSince: number | null
  segment: 'loyal' | 'normal' | 'risk'
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<CustomerEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [q,   setQ]   = useState('')
  const [tab, setTab] = useState('semua')

  useEffect(() => {
    async function load() {
      const [rawCustomers, orders] = await Promise.all([fetchCustomers(), fetchOrders()])
      const now = new Date()

      const enriched: CustomerEnriched[] = rawCustomers.map(c => {
        const cOrders = orders.filter(o => o.customer_id === c.id)
        const totalSpend = cOrders.reduce((s, o) => s + o.total_price, 0)
        const lastOrder = cOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        const lastDate = lastOrder?.created_at || c.last_order_at || null
        const daysSince = lastDate ? differenceInDays(now, new Date(lastDate)) : null
        const segment: 'loyal' | 'normal' | 'risk' =
          c.total_orders >= 3 ? 'loyal' :
          (daysSince !== null && daysSince > 30) ? 'risk' : 'normal'
        return { ...c, totalSpend, lastOrderDate: lastDate, daysSince, segment }
      }).sort((a, b) => b.total_orders - a.total_orders)

      setCustomers(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false
      if (tab === 'loyal')  return c.segment === 'loyal'
      if (tab === 'risk')   return c.segment === 'risk'
      return true
    })
  }, [customers, q, tab])

  const loyal  = customers.filter(c => c.segment === 'loyal').length
  const risk   = customers.filter(c => c.segment === 'risk').length
  const repeat = customers.filter(c => c.total_orders > 1).length

  const SEG_STYLE: Record<string, string> = {
    loyal:  'bg-green-50 text-green-700',
    normal: 'bg-blue-50 text-blue-700',
    risk:   'bg-red-50 text-red-700',
  }
  const SEG_LABEL: Record<string, string> = { loyal: 'Loyal', normal: 'Normal', risk: 'At Risk' }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Manajemen Customer</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">{customers.length} customer terdaftar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: 'Total Customer',  v: customers.length, icon: Users,         c: '' },
          { l: 'Pernah Kembali',  v: repeat,           icon: Repeat,        c: 'text-blue-600' },
          { l: 'Loyal (≥3x)',     v: loyal,            icon: Heart,         c: 'text-[#d4510c]' },
          { l: 'Perlu Dikontak',  v: risk,             icon: AlertTriangle, c: risk > 0 ? 'text-red-600' : '' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{s.l}</div>
            <div className={`text-2xl font-extrabold tracking-tight mt-1.5 ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari nama customer..."
            className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] transition-all" />
        </div>
        <div className="flex gap-1.5">
          {[{ v: 'semua', l: 'Semua' }, { v: 'loyal', l: 'Loyal' }, { v: 'risk', l: 'At Risk' }].map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`px-3.5 py-2 rounded-full border-[1.5px] text-xs font-bold transition-all ${
                tab === t.v
                  ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                  : 'bg-white text-[#8a8a8a] border-[#dddbd5] hover:border-[#525252]'
              }`}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_110px_100px_90px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
          {['Customer', 'Pesanan', 'Total Spend', 'Terakhir', 'Segmen'].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">
            {q ? `Tidak ada customer dengan nama "${q}".` : 'Belum ada customer.'}
          </div>
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {filtered.map(c => (
              <div key={c.id} className="grid grid-cols-[1fr_80px_110px_100px_90px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                {/* Name + initials */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                    c.segment === 'loyal' ? 'bg-green-50 text-green-700' :
                    c.segment === 'risk'  ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0d0d0d] truncate">{c.name}</p>
                    {c.phone && <p className="text-[11px] text-[#8a8a8a] font-mono">{c.phone}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-[#0d0d0d]">{c.total_orders}x</span>
                <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(c.totalSpend)}</span>
                <span className="text-xs text-[#8a8a8a]">
                  {c.lastOrderDate
                    ? c.daysSince === 0 ? 'Hari ini'
                    : c.daysSince === 1 ? 'Kemarin'
                    : `${c.daysSince} hari lalu`
                    : '—'}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-center ${SEG_STYLE[c.segment]}`}>
                  {SEG_LABEL[c.segment]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}