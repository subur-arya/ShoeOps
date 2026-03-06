'use client'
import { AnalitikSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { VerticalBarChart } from '@/components/ui/BarChart'
import { formatRupiah, formatDate } from '@/lib/utils'
import { fetchOrders, fetchTreatments, fetchCustomers, fetchDiscounts, fetchExpenses, fetchMaterials, fetchStockLogs, fetchEquipment, fetchEquipmentLogs, fetchEquipmentUsages, type Equipment, type EquipmentLog } from '@/lib/api'
import type { Discount } from '@/lib/store'
import type { OrderWithDetails, Treatment, Customer, Material, StockLog } from '@/types'
import type { Expense } from '@/lib/api'
import { Printer, Download, TrendingUp, TrendingDown, AlertTriangle, Wrench } from 'lucide-react'
import { differenceInDays, differenceInMonths, addMonths, parseISO, subMonths, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const STATUS_STYLE: Record<string, string> = {
  diterima: 'bg-blue-50 text-blue-700',
  diproses: 'bg-amber-50 text-amber-700',
  selesai:  'bg-green-50 text-green-700',
  diantar:  'bg-orange-50 text-orange-700',
}
const STATUS_LABEL: Record<string, string> = {
  diterima: 'Diterima', diproses: 'Diproses', selesai: 'Selesai', diantar: 'Diantar',
}

export default function AnalitikPage() {
  const [orders,     setOrders]     = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [discounts,  setDiscounts]  = useState<Discount[]>([])
  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [materials,  setMaterials]  = useState<Material[]>([])
  const [stockLogs,  setStockLogs]  = useState<StockLog[]>([])
  const [eqList,     setEqList]     = useState<Equipment[]>([])
  const [eqLogs,     setEqLogs]     = useState<EquipmentLog[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('semua')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [activeTab,  setActiveTab]  = useState<'overview'|'transaksi'|'pengeluaran'|'stok'|'alat'>('overview')

  const now        = new Date()
  const today      = now.toISOString().slice(0, 10)
  const thisMonth  = now.toISOString().slice(0, 7)
  const lastMonth  = subMonths(now, 1).toISOString().slice(0, 7)
  const thisYear   = now.getFullYear().toString()

  useEffect(() => {
    fetchOrders().then(setOrders)
    fetchTreatments().then(setTreatments)
    fetchCustomers().then(setCustomers)
    Promise.resolve(fetchDiscounts()).then(setDiscounts)
    fetchExpenses().then(setExpenses)
    fetchMaterials().then(setMaterials)
    fetchStockLogs().then(setStockLogs)
    fetchEquipment().then(setEqList)
    fetchEquipmentLogs().then(setEqLogs)
    setLoading(false)
  }, [])

  const ordersMonth     = orders.filter(o => o.created_at.startsWith(thisMonth))
  const ordersLastMonth = orders.filter(o => o.created_at.startsWith(lastMonth))
  const ordersYear      = orders.filter(o => o.created_at.startsWith(thisYear))
  const ordersToday     = orders.filter(o => o.created_at.startsWith(today))

  const revMonth     = ordersMonth.reduce((s, o) => s + o.total_price, 0)
  const revLastMonth = ordersLastMonth.reduce((s, o) => s + o.total_price, 0)
  const revYear      = ordersYear.reduce((s, o) => s + o.total_price, 0)
  const revToday     = ordersToday.reduce((s, o) => s + o.total_price, 0)
  const avgMonth     = ordersMonth.length ? Math.round(revMonth / ordersMonth.length) : 0

  const expMonth     = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0)
  const expLastMonth = expenses.filter(e => e.date.startsWith(lastMonth)).reduce((s, e) => s + e.amount, 0)
  const expYear      = expenses.filter(e => e.date.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0)
  const expToday     = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0)

  const labaMonth = revMonth - expMonth
  const labaYear  = revYear  - expYear

  const custActive  = customers.filter(c => c.last_order_at && differenceInDays(now, new Date(c.last_order_at)) <= 30).length
  const loyal       = customers.filter(c => c.total_orders >= 3).length
  const dormant     = customers.filter(c => c.last_order_at && differenceInDays(now, new Date(c.last_order_at)) > 30).length
  const repeatRate  = customers.length ? Math.round(customers.filter(c => c.total_orders > 1).length / customers.length * 100) : 0

  const monthlyData = Array.from({ length: 7 }, (_, i) => {
    const date  = subMonths(now, 6 - i)
    const key   = format(date, 'yyyy-MM')
    const label = format(date, 'MMM', { locale: localeId })
    const rev   = orders.filter(o => o.created_at.startsWith(key)).reduce((s, o) => s + o.total_price, 0)
    const exp   = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value: rev, exp, laba: rev - exp, isCurrent: key === thisMonth }
  })

  const treatStats = treatments.map(t => {
    const tO = ordersMonth.filter(o => o.order_items?.some(i => i.treatment_id === t.id))
    const rev = tO.reduce((s, o) => s + o.total_price, 0)
    const marginPct = t.price >= 100000 ? 'high' : t.price >= 70000 ? 'mid' : 'low'
    return { ...t, count: tO.length, revenue: rev, marginPct }
  }).sort((a, b) => b.revenue - a.revenue)

  const expMonthItems = expenses.filter(e => e.date.startsWith(thisMonth))
  const expByCategory = expMonthItems.reduce<Record<string, { name: string; color: string; total: number }>>((acc, e) => {
    const key   = e.category_id ?? 'none'
    const name  = (e.category as any)?.name  ?? 'Tanpa Kategori'
    const color = (e.category as any)?.color ?? '#c0bdb8'
    if (!acc[key]) acc[key] = { name, color, total: 0 }
    acc[key].total += e.amount
    return acc
  }, {})
  const expCategories = Object.values(expByCategory).sort((a, b) => b.total - a.total)

  const lowStock         = materials.filter(m => m.min_stock > 0 && m.stock <= m.min_stock)
  const totalStockValue  = materials.reduce((s, m) => s + (m.stock * (m.cost_per_unit || 0)), 0)
  const stockOutMonth    = stockLogs.filter(l => l.type === 'out' && l.created_at.startsWith(thisMonth)).reduce((s, l) => s + Math.abs(l.qty), 0)
  const stockInMonth     = stockLogs.filter(l => l.type === 'in'  && l.created_at.startsWith(thisMonth)).reduce((s, l) => s + l.qty, 0)

  const matConsumption = materials.map(m => {
    const consumed = stockLogs.filter(l => l.material_id === m.id && l.type === 'out' && l.created_at.startsWith(thisMonth)).reduce((s, l) => s + Math.abs(l.qty), 0)
    const cost = consumed * (m.cost_per_unit || 0)
    return { ...m, consumed, cost }
  }).filter(m => m.consumed > 0).sort((a, b) => b.cost - a.cost)

  const filteredTrx = useMemo(() => orders.filter(o => {
    if (statusFilter !== 'semua' && o.status !== statusFilter) return false
    if (dateFrom && o.created_at.slice(0, 10) < dateFrom) return false
    if (dateTo   && o.created_at.slice(0, 10) > dateTo)   return false
    return true
  }).slice(0, 100), [orders, statusFilter, dateFrom, dateTo])
  const grandTotal = filteredTrx.reduce((s, o) => s + o.total_price, 0)

  const filteredExp = useMemo(() => expenses.filter(e => {
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo   && e.date > dateTo)   return false
    return true
  }), [expenses, dateFrom, dateTo])
  const grandExp = filteredExp.reduce((s, e) => s + e.amount, 0)

  function Pct({ cur, prev }: { cur: number; prev: number }) {
    if (!prev) return null
    const diff = Math.round((cur - prev) / prev * 100)
    return <span className={`text-[10px] font-bold ml-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%</span>
  }

  async function exportXLSX() {
    try {
      const res = await fetch('/api/export-laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders, expenses, now: now.toISOString() }),
      })
      if (!res.ok) throw new Error('Gagal generate laporan')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `laporan-shoeops-${today}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Gagal export laporan. Coba lagi.')
      console.error(e)
    }
  }

  const MARGIN_STYLE: Record<string,string> = {high:'bg-green-50 text-green-700',mid:'bg-amber-50 text-amber-700',low:'bg-red-50 text-red-700'}
  const MARGIN_LABEL: Record<string,string> = {high:'Tinggi',mid:'Sedang',low:'Rendah'}
  const TABS = [{id:'overview',label:'Overview'},{id:'transaksi',label:'Transaksi'},{id:'pengeluaran',label:'Pengeluaran'},{id:'stok',label:'Stok'},{id:'alat',label:'Analisis Alat'}] as const

  if (loading) return <AnalitikSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Analitik & Laporan</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Data lengkap keuangan dan operasional toko</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportXLSX} className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all"><Download size={14}/> Export XLSX</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all"><Printer size={14}/> Cetak</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/owner" className="px-4 py-2 rounded-full border-[1.5px] border-[#dddbd5] bg-white text-[#8a8a8a] text-sm font-semibold hover:border-[#525252] transition-colors">Dashboard</Link>
        <Link href="/owner/analitik" className="px-4 py-2 rounded-full border-[1.5px] border-[#0d0d0d] bg-[#0d0d0d] text-white text-sm font-bold">Analitik & Laporan</Link>
      </div>

      <div className="flex bg-[#f5f4f1] rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab===t.id?'bg-white text-[#0d0d0d] shadow-sm':'text-[#8a8a8a] hover:text-[#525252]'}`}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {l:'Pemasukan Bulan Ini',  v:formatRupiah(revMonth),  icon:TrendingUp,   color:'text-green-600', bg:'bg-green-50',  cur:revMonth,  prev:revLastMonth},
              {l:'Pengeluaran Bulan Ini',v:formatRupiah(expMonth),  icon:TrendingDown, color:'text-red-500',   bg:'bg-red-50',    cur:expMonth,  prev:expLastMonth},
              {l:'Laba Bersih Bulan Ini',v:formatRupiah(labaMonth), icon:TrendingUp,   color:labaMonth>=0?'text-green-700':'text-red-600', bg:labaMonth>=0?'bg-green-50':'bg-red-50'},
              {l:'Laba Bersih Tahun Ini',v:formatRupiah(labaYear),  icon:TrendingUp,   color:labaYear>=0?'text-green-700':'text-red-600',  bg:labaYear>=0?'bg-green-50':'bg-red-50'},
            ].map(k=>(
              <div key={k.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-3`}><k.icon size={15} className={k.color}/></div>
                <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{k.l}</div>
                <div className={`text-xl font-extrabold tracking-tight mt-1.5 flex items-baseline ${k.color}`}>
                  {k.v}{'cur' in k && <Pct cur={k.cur!} prev={k.prev!}/>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {l:'Transaksi Bulan Ini',  v:String(ordersMonth.length), sub:`vs ${ordersLastMonth.length} bln lalu`, cur:ordersMonth.length, prev:ordersLastMonth.length},
              {l:'Avg per Transaksi',    v:formatRupiah(avgMonth),      sub:'bulan ini'},
              {l:'Customer Aktif (30hr)',v:String(custActive),          sub:`dari ${customers.length} total`},
              {l:'Revenue Tahun Ini',    v:formatRupiah(revYear),       sub:now.getFullYear().toString()},
              {l:'Pengeluaran Thn Ini',  v:formatRupiah(expYear),       sub:now.getFullYear().toString()},
              {l:'Customer Loyal (>=3x)',v:String(loyal),               sub:`${repeatRate}% repeat rate`},
            ].map(k=>(
              <div key={k.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
                <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{k.l}</div>
                <div className="text-xl font-extrabold tracking-tight text-[#0d0d0d] mt-1.5 flex items-baseline">
                  {k.v}{'cur' in k && <Pct cur={k.cur!} prev={k.prev!}/>}
                </div>
                {'sub' in k && <div className="text-xs text-[#8a8a8a] mt-1">{k.sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#dddbd5] p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[13px] font-extrabold text-[#0d0d0d]">Tren Keuangan</p>
                <p className="text-[11px] text-[#8a8a8a] mt-0.5">7 bulan terakhir</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-green-600"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>Masuk</span>
                <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-300 inline-block"/>Keluar</span>
              </div>
            </div>

            {(() => {
              const maxVal = Math.max(...monthlyData.map(d => Math.max(d.value, d.exp)), 1)
              return (
                <div className="space-y-3">
                  {monthlyData.map((m, i) => {
                    const revPct = Math.round((m.value / maxVal) * 100)
                    const expPct = Math.round((m.exp   / maxVal) * 100)
                    const isPos  = m.laba >= 0
                    const fmtVal = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v/1000)}rb` : v > 0 ? String(v) : '—'
                    return (
                      <div key={i} className={`grid grid-cols-[48px_1fr_80px] gap-3 items-center rounded-xl px-3 py-2.5 transition-all ${m.isCurrent ? 'bg-[#fdf0ea] ring-1 ring-[#f0c9b0]' : 'hover:bg-[#fafaf9]'}`}>
                        {/* Bulan */}
                        <div>
                          <p className={`text-[11px] font-extrabold ${m.isCurrent ? 'text-[#d4510c]' : 'text-[#525252]'}`}>{m.label}</p>
                          {m.isCurrent && <p className="text-[9px] text-[#d4510c]/60 font-semibold">Skrg</p>}
                        </div>

                        {/* Bars */}
                        <div className="space-y-1.5">
                          {/* Pemasukan */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-[6px] bg-[#eceae6] rounded-full overflow-hidden">
                              <div className="h-full bg-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${revPct}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-[#525252] w-10 text-right tabular-nums">{fmtVal(m.value)}</span>
                          </div>
                          {/* Pengeluaran */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-[6px] bg-[#eceae6] rounded-full overflow-hidden">
                              <div className="h-full bg-red-300 rounded-full transition-all duration-500"
                                style={{ width: `${expPct}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-[#525252] w-10 text-right tabular-nums">{fmtVal(m.exp)}</span>
                          </div>
                        </div>

                        {/* Laba badge */}
                        <div className={`text-right`}>
                          <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg inline-block ${isPos ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {isPos ? '+' : ''}{fmtVal(m.laba)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-extrabold text-[#0d0d0d]">Profitabilitas Treatment</span>
                <span className="text-[11px] text-[#8a8a8a]">bulan ini</span>
              </div>
              {treatStats.filter(t=>t.count>0).length===0
                ?<p className="text-sm text-[#8a8a8a] py-4 text-center">Belum ada data.</p>
                :<div className="divide-y divide-[#eceae6]">
                  {treatStats.filter(t=>t.count>0).map(t=>(
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-sm font-semibold text-[#0d0d0d] flex-1 truncate">{t.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${MARGIN_STYLE[t.marginPct]}`}>{MARGIN_LABEL[t.marginPct]}</span>
                      <span className="text-xs text-[#8a8a8a]">{t.count}x</span>
                      <span className="text-xs font-bold text-[#525252] min-w-[72px] text-right">{formatRupiah(t.revenue)}</span>
                    </div>
                  ))}
                </div>
              }
            </div>

            <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-extrabold text-[#0d0d0d]">Pengeluaran per Kategori</span>
                <span className="text-[11px] text-[#8a8a8a]">bulan ini</span>
              </div>
              {expCategories.length===0
                ?<p className="text-sm text-[#8a8a8a] py-4 text-center">Belum ada pengeluaran bulan ini.</p>
                :<div className="space-y-2.5">
                  {expCategories.map((c,i)=>(
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{background:c.color}}/>
                          <span className="text-sm font-semibold text-[#0d0d0d]">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#8a8a8a]">{expMonth>0?Math.round(c.total/expMonth*100):0}%</span>
                          <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(c.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#eceae6] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{width:`${expMonth>0?(c.total/expMonth)*100:0}%`,background:c.color}}/>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#eceae6] flex justify-between">
                    <span className="text-xs font-bold text-[#8a8a8a]">Total</span>
                    <span className="text-sm font-extrabold text-[#d4510c]">{formatRupiah(expMonth)}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <h2 className="text-sm font-extrabold text-[#0d0d0d]">Perbandingan Periode</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              {title:'Hari Ini',rows:[
                {l:'Pesanan',     v:String(ordersToday.length)},
                {l:'Pemasukan',   v:formatRupiah(revToday)},
                {l:'Pengeluaran', v:formatRupiah(expToday)},
                {l:'Laba',        v:formatRupiah(revToday-expToday),green:revToday>=expToday},
              ]},
              {title:'Bulan Ini vs Lalu',rows:[
                {l:'Pesanan',      v:String(ordersMonth.length), p:String(ordersLastMonth.length),up:ordersMonth.length>=ordersLastMonth.length},
                {l:'Pemasukan',    v:formatRupiah(revMonth),     p:formatRupiah(revLastMonth),    up:revMonth>=revLastMonth},
                {l:'Pengeluaran',  v:formatRupiah(expMonth),     p:formatRupiah(expLastMonth),    up:expMonth<=expLastMonth},
                {l:'Laba Bersih',  v:formatRupiah(labaMonth),    p:formatRupiah(revLastMonth-expLastMonth), up:labaMonth>=revLastMonth-expLastMonth},
              ]},
              {title:'Customer',rows:[
                {l:'Total Unik',   v:String(customers.length)},
                {l:'Aktif (30hr)', v:String(custActive)},
                {l:'Tidak Aktif',  v:String(dormant)},
                {l:'Repeat Rate',  v:`${repeatRate}%`},
              ]},
            ].map(p=>(
              <div key={p.title} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
                <p className="text-[13px] font-extrabold text-[#0d0d0d] mb-3">{p.title}</p>
                <div className="divide-y divide-[#eceae6]">
                  {p.rows.map(r=>(
                    <div key={r.l} className="flex items-center justify-between py-2">
                      <span className="text-xs text-[#525252]">{r.l}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${'up' in r?(r.up?'text-green-600':'text-red-600'):'green' in r?(r.green?'text-green-600':'text-red-500'):'text-[#0d0d0d]'}`}>{r.v}</span>
                        {'p' in r && r.p && <p className="text-[10px] text-[#8a8a8a]">vs {r.p}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {discounts.length>0 && (
            <div>
              <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-3">Performa Promo</h2>
              <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_80px_90px_80px_80px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
                  {['Kode Promo','Tipe','Nilai','Terpakai','Kuota','Status'].map(h=><span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>)}
                </div>
                <div className="divide-y divide-[#eceae6]">
                  {discounts.sort((a,b)=>b.usedCount-a.usedCount).map(d=>{
                    const pctUsed=d.maxUses?Math.round(d.usedCount/d.maxUses*100):null
                    const isExpired=d.expiresAt&&new Date(d.expiresAt)<new Date()
                    return (
                      <div key={d.id} className="grid grid-cols-[1fr_80px_80px_90px_80px_80px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                        <div><p className="text-sm font-bold font-mono text-[#0d0d0d]">{d.code}</p>{d.minOrder>0&&<p className="text-[10px] text-[#8a8a8a]">Min. {formatRupiah(d.minOrder)}</p>}</div>
                        <span className="text-xs text-[#525252]">{d.type==='pct'?'Persentase':'Nominal'}</span>
                        <span className="text-sm font-bold text-[#0d0d0d]">{d.type==='pct'?`${d.value}%`:formatRupiah(d.value)}</span>
                        <div>
                          <div className="flex items-center gap-2"><span className="text-sm font-bold text-[#0d0d0d]">{d.usedCount}x</span>{pctUsed!==null&&<span className="text-[10px] text-[#8a8a8a]">({pctUsed}%)</span>}</div>
                          {pctUsed!==null&&<div className="w-full bg-[#eceae6] rounded-full h-1 mt-1"><div className={`h-1 rounded-full ${pctUsed>=90?'bg-red-400':pctUsed>=60?'bg-amber-400':'bg-green-400'}`} style={{width:`${Math.min(pctUsed,100)}%`}}/></div>}
                        </div>
                        <span className="text-xs text-[#8a8a8a]">{d.maxUses??'∞'}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full text-center w-fit ${isExpired?'bg-gray-100 text-gray-500':!d.active?'bg-red-50 text-red-600':d.maxUses&&d.usedCount>=d.maxUses?'bg-gray-100 text-gray-500':'bg-green-50 text-green-700'}`}>
                          {isExpired?'Kadaluarsa':!d.active?'Nonaktif':d.maxUses&&d.usedCount>=d.maxUses?'Habis':'Aktif'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSAKSI ── */}
      {activeTab==='transaksi' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap bg-white border border-[#dddbd5] rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Filter:</span>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs font-semibold bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] cursor-pointer">
              <option value="semua">Semua Status</option>
              {['selesai','diproses','diantar','diterima'].map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] outline-none focus:border-[#d4510c]"/>
              <span className="text-xs text-[#8a8a8a]">s/d</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] outline-none focus:border-[#d4510c]"/>
            </div>
            {(statusFilter!=='semua'||dateFrom||dateTo)&&<button onClick={()=>{setStatusFilter('semua');setDateFrom('');setDateTo('')}} className="text-xs font-bold text-[#d4510c] hover:underline">Reset</button>}
            <span className="ml-auto text-xs text-[#8a8a8a]">{filteredTrx.length} transaksi</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_110px_110px_100px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
              {['Kode','Customer & Treatment','Tanggal','Total','Status'].map(h=><span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>)}
            </div>
            {filteredTrx.length===0?<p className="text-center py-10 text-sm text-[#8a8a8a]">Tidak ada transaksi.</p>:(
              <div className="divide-y divide-[#eceae6]">
                {filteredTrx.map(o=>(
                  <div key={o.id} className="grid grid-cols-[80px_1fr_110px_110px_100px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                    <span className="font-mono text-xs text-[#8a8a8a]">{o.order_code}</span>
                    <div className="min-w-0"><p className="text-sm font-bold text-[#0d0d0d] truncate">{o.customers?.name}</p><p className="text-[11px] text-[#8a8a8a] truncate">{o.order_items?.[0]?.treatment_name}</p></div>
                    <span className="text-xs text-[#8a8a8a]">{formatDate(o.created_at)}</span>
                    <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(o.total_price)}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-center ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[80px_1fr_110px_110px_100px] gap-3 items-center px-5 py-3 bg-[#0d0d0d]">
                  <span className="text-[11px] font-bold text-white/40 col-span-3">{filteredTrx.length} transaksi</span>
                  <span className="text-sm font-extrabold text-[#e8784a]">{formatRupiah(grandTotal)}</span><span/>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PENGELUARAN ── */}
      {activeTab==='pengeluaran' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap bg-white border border-[#dddbd5] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] outline-none focus:border-[#d4510c]"/>
              <span className="text-xs text-[#8a8a8a]">s/d</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] outline-none focus:border-[#d4510c]"/>
            </div>
            {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom('');setDateTo('')}} className="text-xs font-bold text-[#d4510c] hover:underline">Reset</button>}
            <span className="ml-auto text-xs text-[#8a8a8a]">{filteredExp.length} item · <strong className="text-[#d4510c]">{formatRupiah(grandExp)}</strong></span>
          </div>
          <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_130px_110px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
              {['Tanggal','Nama','Kategori','Jumlah'].map(h=><span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>)}
            </div>
            {filteredExp.length===0?<p className="text-center py-10 text-sm text-[#8a8a8a]">Tidak ada pengeluaran.</p>:(
              <div className="divide-y divide-[#eceae6]">
                {filteredExp.map(e=>(
                  <div key={e.id} className="grid grid-cols-[100px_1fr_130px_110px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                    <span className="text-xs text-[#8a8a8a]">{new Date(e.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span>
                    <div><p className="text-sm font-semibold text-[#0d0d0d]">{e.name}</p>{e.notes&&<p className="text-[11px] text-[#8a8a8a]">{e.notes}</p>}</div>
                    {e.category?<span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit" style={{background:(e.category as any).color+'20',color:(e.category as any).color}}>{(e.category as any).name}</span>:<span className="text-[11px] text-[#c0bdb8]">—</span>}
                    <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(e.amount)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[100px_1fr_130px_110px] gap-3 items-center px-5 py-3 bg-[#0d0d0d]">
                  <span className="text-[11px] font-bold text-white/40 col-span-3">{filteredExp.length} pengeluaran</span>
                  <span className="text-sm font-extrabold text-[#e8784a]">{formatRupiah(grandExp)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STOK ── */}
      {activeTab==='stok' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {l:'Total Bahan',         v:String(materials.length),       sub:'jenis bahan'},
              {l:'Nilai Stok',          v:formatRupiah(totalStockValue),  sub:'estimasi total'},
              {l:'Pemakaian Bulan Ini', v:stockOutMonth.toFixed(1),       sub:'total unit keluar'},
              {l:'Restock Bulan Ini',   v:stockInMonth.toFixed(1),        sub:'total unit masuk'},
            ].map(k=>(
              <div key={k.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
                <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{k.l}</div>
                <div className="text-xl font-extrabold tracking-tight text-[#0d0d0d] mt-1.5">{k.v}</div>
                <div className="text-xs text-[#8a8a8a] mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {lowStock.length>0&&(
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle size={15} className="text-red-500"/><span className="text-sm font-bold text-red-700">{lowStock.length} bahan perlu restock segera!</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lowStock.map(m=>(
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-red-200">
                    <span className="text-sm font-semibold text-[#0d0d0d]">{m.name}</span>
                    <div className="text-right"><span className="text-sm font-bold text-red-600">{m.stock} {m.unit}</span><p className="text-[10px] text-[#8a8a8a]">min: {m.min_stock} {m.unit}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4]"><span className="text-[13px] font-extrabold text-[#0d0d0d]">Status Semua Bahan</span></div>
            <div className="divide-y divide-[#eceae6]">
              {materials.length===0?<p className="text-center py-8 text-sm text-[#8a8a8a]">Belum ada bahan baku.</p>:materials.map(m=>{
                const pct = m.min_stock>0?Math.min((m.stock/(m.min_stock*3))*100,100):50
                const status = m.min_stock>0&&m.stock<=m.min_stock?'kritis':m.min_stock>0&&m.stock<=m.min_stock*2?'rendah':'aman'
                const barColor = status==='kritis'?'bg-red-400':status==='rendah'?'bg-amber-400':'bg-green-400'
                const consumed = matConsumption.find(mc=>mc.id===m.id)
                return (
                  <div key={m.id} className="px-5 py-3 hover:bg-[#fafaf9] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#0d0d0d]">{m.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status==='kritis'?'bg-red-50 text-red-600':status==='rendah'?'bg-amber-50 text-amber-600':'bg-green-50 text-green-600'}`}>
                          {status==='kritis'?'⚠ Kritis':status==='rendah'?'Rendah':'Aman'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        {consumed&&<span className="text-[11px] text-[#8a8a8a]">Pakai: {consumed.consumed.toFixed(1)} {m.unit}/bln</span>}
                        <span className="text-sm font-bold text-[#0d0d0d]">{m.stock} {m.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#eceae6] rounded-full h-2"><div className={`h-2 rounded-full ${barColor} transition-all`} style={{width:`${pct}%`}}/></div>
                      {m.min_stock>0&&<span className="text-[10px] text-[#8a8a8a] flex-shrink-0">min: {m.min_stock} {m.unit}</span>}
                      {m.cost_per_unit>0&&<span className="text-[10px] text-[#8a8a8a] flex-shrink-0">nilai: {formatRupiah(m.stock*m.cost_per_unit)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {matConsumption.length>0&&(
            <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4] flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-[#0d0d0d]">Bahan Paling Banyak Dipakai</span>
                <span className="text-[11px] text-[#8a8a8a]">bulan ini</span>
              </div>
              <div className="divide-y divide-[#eceae6]">
                {matConsumption.slice(0,8).map((m,i)=>(
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-[11px] font-bold text-[#c0bdb8] w-5">{i+1}</span>
                    <span className="flex-1 text-sm font-semibold text-[#0d0d0d]">{m.name}</span>
                    <span className="text-xs text-[#8a8a8a]">{m.consumed.toFixed(1)} {m.unit}</span>
                    {m.cost>0&&<span className="text-sm font-bold text-[#d4510c]">{formatRupiah(m.cost)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ANALISIS ALAT ── */}
      {activeTab==='alat' && (() => {
        const totalInvestasi   = eqList.reduce((s,e) => s + (e.purchase_price||0), 0)
        const totalPerawatan   = eqLogs.reduce((s,l) => s + l.amount, 0)
        const totalBiaya       = totalInvestasi + totalPerawatan
        const perluPerhatian   = eqList.filter(e => e.condition==='perlu_servis'||e.condition==='rusak')
        const COND_COLOR: Record<string,string> = {
          baru:'bg-blue-50 text-blue-700', baik:'bg-green-50 text-green-700',
          perlu_servis:'bg-amber-50 text-amber-700', rusak:'bg-red-50 text-red-700'
        }
        const COND_LABEL: Record<string,string> = {
          baru:'Baru', baik:'Baik', perlu_servis:'Perlu Servis', rusak:'Rusak'
        }
        const LOG_LABEL: Record<string,string> = {
          pembelian:'Pembelian', servis:'Servis', perbaikan:'Perbaikan',
          penggantian:'Penggantian', lainnya:'Lainnya'
        }

        // Biaya per alat
        const eqStats = eqList.map(eq => {
          const logs     = eqLogs.filter(l => l.equipment_id === eq.id)
          const maint    = logs.reduce((s,l) => s + l.amount, 0)
          const total    = (eq.purchase_price||0) + maint
          const ageM     = eq.purchase_date ? differenceInMonths(new Date(), parseISO(eq.purchase_date)) : 0
          const remainM  = eq.purchase_date ? Math.max(0, eq.estimated_lifetime_months - ageM) : null
          const pct      = eq.purchase_date ? Math.min(Math.round(ageM/eq.estimated_lifetime_months*100),100) : null
          const perBulan = ageM > 0 ? Math.round(total/ageM) : 0
          const endDate  = eq.purchase_date ? addMonths(parseISO(eq.purchase_date), eq.estimated_lifetime_months) : null
          return { eq, logs, maint, total, ageM, remainM, pct, perBulan, endDate }
        }).sort((a,b) => b.total - a.total)

        // Biaya per jenis log bulan ini
        const now  = new Date()
        const m0   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
        const logsByType = ['servis','perbaikan','penggantian','lainnya'].map(type => ({
          type, label: LOG_LABEL[type],
          total: eqLogs.filter(l => l.type===type && l.date.slice(0,7)===m0).reduce((s,l)=>s+l.amount,0)
        })).filter(x => x.total > 0)

        // Alat mendekati akhir umur (sisa ≤ 3 bulan)
        const nearExpiry = eqStats.filter(s => s.remainM !== null && s.remainM <= 3 && s.remainM >= 0)

        return (
          <div className="space-y-4">

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l:'Total Alat',      v: String(eqList.length),          sub:'unit terdaftar',     color:'text-[#d4510c]', bg:'bg-[#fdf0ea]' },
                { l:'Total Investasi', v: formatRupiah(totalInvestasi),    sub:'harga beli alat',    color:'text-blue-600',  bg:'bg-blue-50'   },
                { l:'Biaya Perawatan', v: formatRupiah(totalPerawatan),    sub:'servis + perbaikan', color:'text-purple-600',bg:'bg-purple-50' },
                { l:'Total Biaya',     v: formatRupiah(totalBiaya),        sub:'investasi + rawat',  color:'text-[#0d0d0d]', bg:'bg-[#f5f4f1]' },
              ].map(k => (
                <div key={k.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
                  <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                    <Wrench size={13} className={k.color} />
                  </div>
                  <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{k.l}</div>
                  <div className="text-lg font-extrabold text-[#0d0d0d] mt-0.5 leading-tight">{k.v}</div>
                  <div className="text-[11px] text-[#8a8a8a]">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Alert perlu perhatian */}
            {perluPerhatian.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-700">{perluPerhatian.length} alat perlu perhatian segera</p>
                  <p className="text-xs text-amber-600 mt-0.5">{perluPerhatian.map(e=>e.name).join(' · ')}</p>
                </div>
              </div>
            )}

            {/* Alert mendekati akhir umur */}
            {nearExpiry.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">{nearExpiry.length} alat mendekati akhir estimasi umur</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {nearExpiry.map(s => (
                      <span key={s.eq.id} className="text-[11px] font-semibold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        {s.eq.name} — sisa {s.remainM} bln
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Biaya per alat */}
              <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#eceae6] flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-[#0d0d0d]">Biaya per Alat</span>
                  <Link href="/owner/alat" className="text-[11px] text-[#d4510c] font-bold hover:underline">Kelola →</Link>
                </div>
                {eqList.length === 0 ? (
                  <p className="text-sm text-[#8a8a8a] text-center py-8">Belum ada data alat.</p>
                ) : (
                  <div className="divide-y divide-[#eceae6]">
                    {eqStats.map(s => (
                      <div key={s.eq.id} className="px-5 py-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-[#0d0d0d] truncate">{s.eq.name}</span>
                            {s.eq.brand && <span className="text-[10px] text-[#8a8a8a]">{s.eq.brand}</span>}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${COND_COLOR[s.eq.condition]}`}>
                              {COND_LABEL[s.eq.condition]}
                            </span>
                          </div>
                          <span className="text-sm font-extrabold text-[#0d0d0d] flex-shrink-0">{formatRupiah(s.total)}</span>
                        </div>
                        {/* Progress umur */}
                        {s.pct !== null && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-[#8a8a8a]">
                              <span>Umur: {s.ageM}/{s.eq.estimated_lifetime_months} bln</span>
                              <span className={s.remainM===0?'text-red-500':s.remainM!<=3?'text-amber-500':'text-green-600'}>
                                {s.remainM! > 0 ? `sisa ${s.remainM} bln` : 'melewati estimasi'}
                              </span>
                            </div>
                            <div className="w-full bg-[#eceae6] rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${s.pct>=90?'bg-red-400':s.pct>=70?'bg-amber-400':'bg-green-400'}`}
                                style={{width:`${s.pct}%`}} />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3 text-[10px] text-[#8a8a8a]">
                          <span>Beli: <span className="font-semibold">{formatRupiah(s.eq.purchase_price)}</span></span>
                          <span>Perawatan: <span className="font-semibold text-[#d4510c]">{formatRupiah(s.maint)}</span></span>
                          {s.perBulan > 0 && <span>~<span className="font-semibold">{formatRupiah(s.perBulan)}</span>/bln</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Riwayat biaya terbaru & breakdown jenis */}
              <div className="space-y-4">

                {/* Breakdown biaya bulan ini per jenis */}
                {logsByType.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#eceae6]">
                      <span className="text-[13px] font-extrabold text-[#0d0d0d]">Biaya Bulan Ini</span>
                      <p className="text-[11px] text-[#8a8a8a] mt-0.5">per jenis</p>
                    </div>
                    <div className="px-5 py-3 space-y-2.5">
                      {logsByType.map(x => {
                        const maxT = Math.max(...logsByType.map(l=>l.total),1)
                        return (
                          <div key={x.type}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[#525252]">{x.label}</span>
                              <span className="font-bold text-[#0d0d0d]">{formatRupiah(x.total)}</span>
                            </div>
                            <div className="w-full bg-[#eceae6] rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-[#d4510c] transition-all" style={{width:`${Math.round(x.total/maxT*100)}%`}} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Log terbaru */}
                <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#eceae6] flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-[#0d0d0d]">Riwayat Biaya</span>
                    <span className="text-[11px] text-[#8a8a8a]">10 terbaru</span>
                  </div>
                  {eqLogs.length === 0 ? (
                    <p className="text-sm text-[#8a8a8a] text-center py-8">Belum ada riwayat biaya.</p>
                  ) : (
                    <div className="divide-y divide-[#eceae6]">
                      {eqLogs.slice(0,10).map(l => {
                        const eq = eqList.find(e=>e.id===l.equipment_id)
                        return (
                          <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#0d0d0d] truncate">{eq?.name ?? '—'}</p>
                              <p className="text-[10px] text-[#8a8a8a]">
                                {new Date(l.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'2-digit'})}
                                {l.notes && ` · ${l.notes}`}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              l.type==='servis'?'bg-amber-50 text-amber-700':
                              l.type==='perbaikan'?'bg-orange-50 text-orange-700':
                              l.type==='penggantian'?'bg-purple-50 text-purple-700':
                              'bg-gray-50 text-gray-600'
                            }`}>{LOG_LABEL[l.type]}</span>
                            <span className="text-sm font-bold text-[#0d0d0d] flex-shrink-0">{formatRupiah(l.amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="h-8"/>
    </div>
  )
}