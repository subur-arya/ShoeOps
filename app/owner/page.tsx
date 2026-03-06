'use client'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { KpiCard } from '@/components/owner/KpiCard'
import { InsightBlock } from '@/components/owner/InsightBlock'
import { Toggle } from '@/components/ui/Toggle'
import { HorizontalBarChart, VerticalBarChart } from '@/components/ui/BarChart'
import { formatRupiah, formatDate, generateInsights } from '@/lib/utils'
import { fetchOrders, fetchTreatments, fetchCustomers, editTreatment, fetchTenantSettings, fetchMaterials } from '@/lib/api'
import type { OrderWithDetails, Treatment, Customer, Material } from '@/types'
import { MonthlyTargetWidget } from '@/components/owner/MonthlyTargetWidget'
import { AlertTriangle, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { differenceInDays, subDays, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function OwnerPage() {
  const [orders,    setOrders]    = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [treatments,setTreatments]= useState<Treatment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [period,    setPeriod]    = useState('Bulan Ini')
  const [targetHarian,   setTargetHarian]   = useState(0)
  const [targetBulanan,  setTargetBulanan]  = useState(0)
  const [targetPesanan,  setTargetPesanan]  = useState(0)
  const [targetCustomer, setTargetCustomer] = useState(0)
  const [activeUntil,    setActiveUntil]    = useState<string | null>(null)
  const [materials,     setMaterials]     = useState<Material[]>([])

  useEffect(() => {
    fetchOrders().then(setOrders)
    fetchTreatments().then(setTreatments)
    fetchCustomers().then(setCustomers)
    fetchMaterials().then(setMaterials)
    fetchTenantSettings().then(info => {
    setLoading(false)
      if (info) {
        if (info.targetHarian)   setTargetHarian(info.targetHarian)
        if (info.targetBulanan)  setTargetBulanan(info.targetBulanan)
        if (info.targetPesanan)  setTargetPesanan(info.targetPesanan)
        if (info.targetCustomer) setTargetCustomer(info.targetCustomer)
        if (info.activeUntil)    setActiveUntil(info.activeUntil)
      }
    })
  }, [])

  // Derived stats
  const now = new Date()
  const today  = now.toISOString().slice(0, 10)
  const thisMonth = now.toISOString().slice(0, 7)

  const ordersToday  = orders.filter(o => o.created_at.startsWith(today))
  const ordersMonth  = orders.filter(o => o.created_at.startsWith(thisMonth))
  const revenueToday = ordersToday.reduce((s, o) => s + o.total_price, 0)
  const revenueMonth = ordersMonth.reduce((s, o) => s + o.total_price, 0)

  // Customer unik bulan ini
  const customerMonthSet = new Set(ordersMonth.map(o => o.customer_id).filter(Boolean))
  const customerMonth    = customerMonthSet.size

  // Sisa hari bulan ini
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate()

  const pending  = orders.filter(o => o.status === 'diterima' || o.status === 'diproses')
  const dormant  = customers.filter(c => c.last_order_at && differenceInDays(now, new Date(c.last_order_at)) > 30)
  const lowStock = materials.filter(m => m.min_stock > 0 && m.stock <= m.min_stock)

  // Pendapatan 7 hari terakhir dari orders nyata
  const dailySales = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i)
    const key  = format(date, 'yyyy-MM-dd')
    const label = format(date, 'EEE', { locale: localeId })
    const value = orders
      .filter(o => o.created_at.startsWith(key))
      .reduce((s, o) => s + o.total_price, 0)
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value }
  })

  // Jam paling ramai dari orders nyata
  const hourMap: Record<number, number> = {}
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours()
    hourMap[h] = (hourMap[h] ?? 0) + 1
  })
  const peakHours = Array.from({ length: 12 }, (_, i) => {
    const h = i + 8 // jam 08 - 19
    return { label: `${String(h).padStart(2, '0')}`, value: hourMap[h] ?? 0 }
  })
  const peakHour = peakHours.reduce((a, b) => a.value >= b.value ? a : b, peakHours[0])

  // Treatment stats dari orders nyata
  const treatStats = treatments.map(t => {
    const tOrders = ordersMonth.filter(o => o.order_items?.some(i => i.treatment_id === t.id))
    return { ...t, count: tOrders.length, revenue: tOrders.reduce((s, o) => s + o.total_price, 0) }
  }).sort((a, b) => b.count - a.count)

  const maxRev = Math.max(...treatStats.map(t => t.revenue), 1)

  // Loyal customers (3+ orders)
  const loyalCustomers = [...customers]
    .filter(c => c.total_orders >= 3)
    .sort((a, b) => b.total_orders - a.total_orders)
    .slice(0, 5)

  const insights = generateInsights({
    monthRevenue: revenueMonth,
    lastMonthRevenue: revenueMonth * 0.85,
    topTreatment: treatStats[0]?.name,
    dormantCount: dormant.length,
    busiestDay: dailySales.reduce((a, b) => a.value >= b.value ? a : b, dailySales[0])?.label ?? '-',
    avgTransaction: ordersMonth.length ? revenueMonth / ordersMonth.length : 0,
    peakHour: peakHour?.value > 0 ? `${peakHour.label}.00` : '-',
  })

  async function toggleTreatment(id: string, val: boolean) {
    const updated = await editTreatment(id, { is_active: val })
    setTreatments(updated)
  }

  const vs = period === 'Hari Ini' ? 'kemarin' : period === 'Bulan Ini' ? 'bulan lalu' : 'tahun lalu'
  const currentRevenue = period === 'Hari Ini' ? revenueToday : revenueMonth
  const currentOrders  = period === 'Hari Ini' ? ordersToday.length : ordersMonth.length

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Dashboard Bisnis</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            {now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className="flex gap-1.5">
          {['Hari Ini', 'Bulan Ini', 'Tahun Ini'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-full border-[1.5px] text-xs font-bold transition-all ${
                period === p
                  ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                  : 'bg-white text-[#8a8a8a] border-[#dddbd5] hover:border-[#525252]'
              }`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Sub nav */}
      <div className="flex gap-2">
        <Link href="/owner" className="px-4 py-2 rounded-full border-[1.5px] border-[#0d0d0d] bg-[#0d0d0d] text-white text-sm font-bold">Dashboard</Link>
        <Link href="/owner/analitik" className="px-4 py-2 rounded-full border-[1.5px] border-[#dddbd5] bg-white text-[#8a8a8a] text-sm font-semibold hover:border-[#525252] transition-colors">Analitik & Laporan</Link>
      </div>

      {/* Attention */}
      {(pending.length > 0 || dormant.length > 0 || lowStock.length > 0) && (
        <div className="bg-white border border-[#dddbd5] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-[#dddbd5]">
            <AlertTriangle size={13} className="text-red-600" />
            <span className="text-xs font-bold text-red-700">Perlu Perhatian</span>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f0efec]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-xs text-[#1f1f1f] flex-1">
                <strong>{pending.length} pesanan</strong> masih dalam proses (diterima/diproses).
              </span>
              <Link href="/owner/pesanan" className="text-[11px] font-bold text-[#d4510c] px-2.5 py-1 rounded-md border border-[#dddbd5] bg-white hover:bg-[#fdf0ea] hover:border-[#d4510c] transition-all">Lihat</Link>
            </div>
          )}
          {dormant.length > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2.5 ${lowStock.length > 0 ? 'border-b border-[#f0efec]' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-xs text-[#1f1f1f] flex-1">
                <strong>{dormant.length} customer</strong> belum kembali lebih dari 30 hari.
              </span>
              <Link href="/owner/customer" className="text-[11px] font-bold text-[#d4510c] px-2.5 py-1 rounded-md border border-[#dddbd5] bg-white hover:bg-[#fdf0ea] hover:border-[#d4510c] transition-all">Detail</Link>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-xs text-[#1f1f1f] flex-1">
                  <strong>{lowStock.length} bahan baku</strong> hampir habis.
                </span>
                <Link href="/owner/stok" className="text-[11px] font-bold text-[#d4510c] px-2.5 py-1 rounded-md border border-[#dddbd5] bg-white hover:bg-[#fdf0ea] hover:border-[#d4510c] transition-all">Kelola</Link>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-4">
                {lowStock.map(m => (
                  <span key={m.id} className="text-[10px] bg-orange-50 text-orange-700 font-semibold px-2 py-0.5 rounded-lg border border-orange-200">
                    {m.name} — {m.stock} {m.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Pendapatan" value={formatRupiah(currentRevenue)} change="+15%" changePositive period={vs}
          target={period === 'Hari Ini' ? targetHarian : period === 'Bulan Ini' ? targetBulanan : 0}
          current={currentRevenue}
          targetLabel={period === 'Hari Ini' ? formatRupiah(targetHarian) : period === 'Bulan Ini' ? formatRupiah(targetBulanan) : undefined}
        />
        <KpiCard label="Total Pesanan" value={String(currentOrders)} change="+8%" changePositive period={vs} />
        <KpiCard label="Avg Transaksi" value={ordersMonth.length ? formatRupiah(Math.round(revenueMonth / ordersMonth.length)) : 'Rp0'} change="+5%" changePositive period={vs} />
        <KpiCard label="Customer Aktif" value={String(customers.filter(c => c.last_order_at && differenceInDays(now, new Date(c.last_order_at)) <= 30).length)} change="+3%" changePositive period={vs} />
      </div>

      {/* Insights */}
      {insights.length > 0 && <InsightBlock insights={insights} />}

      {/* Target Bulanan */}
      <MonthlyTargetWidget
        revenueMonth={revenueMonth}
        targetBulanan={targetBulanan}
        pesananMonth={ordersMonth.length}
        targetPesanan={targetPesanan}
        customerMonth={customerMonth}
        targetCustomer={targetCustomer}
        daysLeft={daysLeft}
        daysInMonth={daysInMonth}
      />

      {/* Charts */}
      <div>
        <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-3">Analisis Penjualan</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-extrabold text-[#0d0d0d]">Pendapatan 7 Hari</span>
              <span className="text-[11px] text-[#8a8a8a]">per hari</span>
            </div>
            {dailySales.every(d => d.value === 0) ? (
              <p className="text-sm text-[#8a8a8a] py-6 text-center">Belum ada data 7 hari terakhir.</p>
            ) : (
              <HorizontalBarChart items={dailySales.map(d => ({
                label: d.label, value: d.value,
                displayValue: d.value > 0 ? `Rp${(d.value / 1000).toFixed(0)}rb` : '-',
              }))} />
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-extrabold text-[#0d0d0d]">Jam Paling Ramai</span>
              <span className="text-[11px] text-[#8a8a8a]">rata-rata/jam</span>
            </div>
            {peakHours.every(p => p.value === 0) ? (
              <p className="text-sm text-[#8a8a8a] py-6 text-center">Belum ada data pesanan.</p>
            ) : (
              <VerticalBarChart items={peakHours.map(p => ({
                label: p.label, value: p.value,
                highlight: p.value === Math.max(...peakHours.map(x => x.value)) && p.value > 0,
              }))} height={96} />
            )}
          </div>
        </div>
      </div>

      {/* Treatment + Customer */}
      <div>
        <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-3">Analisis Treatment & Customer</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Treatment */}
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-extrabold text-[#0d0d0d]">Treatment Terpopuler</span>
              <span className="text-[11px] text-[#8a8a8a]">bulan ini</span>
            </div>
            {treatStats.filter(t => t.is_active).length === 0 ? (
              <p className="text-sm text-[#8a8a8a] py-4 text-center">Belum ada data pesanan bulan ini.</p>
            ) : (
              <HorizontalBarChart items={treatStats.filter(t => t.is_active).map((t, i) => ({
                label: t.name, value: t.revenue,
                displayValue: formatRupiah(t.revenue), subValue: `${t.count}x`, rank: i,
              }))} />
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="mb-3">
              <span className="text-[13px] font-extrabold text-[#0d0d0d]">Analisis Customer</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { l: 'Total Customer',  v: String(customers.length), c: '' },
                { l: 'Repeat Rate',     v: customers.length ? Math.round(customers.filter(c => c.total_orders > 1).length / customers.length * 100) + '%' : '0%', c: 'text-green-600' },
                { l: 'Loyal (≥3x)',     v: String(loyalCustomers.length), c: 'text-[#d4510c]' },
                { l: 'Tidak Aktif',     v: String(dormant.length), c: dormant.length > 0 ? 'text-red-600' : '' },
              ].map(m => (
                <div key={m.l} className="bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6]">
                  <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">{m.l}</div>
                  <div className={`text-xl font-extrabold tracking-tight mt-1 ${m.c}`}>{m.v}</div>
                </div>
              ))}
            </div>
            {loyalCustomers.length > 0 ? (
              <>
                <p className="text-xs font-bold text-[#0d0d0d] mb-2">Customer Paling Setia</p>
                <div className="space-y-0 divide-y divide-[#eceae6]">
                  {loyalCustomers.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-xs font-extrabold text-green-700 flex-shrink-0">
                        {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#0d0d0d] truncate">{c.name}</div>
                        <div className="text-[10px] text-[#8a8a8a]">{c.total_orders}x pesanan</div>
                      </div>
                      <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Loyal</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#8a8a8a] text-center py-2">Belum ada customer loyal.</p>
            )}
          </div>
        </div>
      </div>

      {/* Dormant */}
      {dormant.length > 0 && (
        <div>
          <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-3">Customer Belum Kembali (&gt;30 Hari)</h2>
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="space-y-0 divide-y divide-[#eceae6]">
              {dormant.slice(0, 6).map(c => {
                const days = c.last_order_at ? differenceInDays(now, new Date(c.last_order_at)) : 0
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-xs font-extrabold text-red-600 flex-shrink-0">
                      {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#0d0d0d]">{c.name}</div>
                      <div className="text-[10px] text-[#8a8a8a] mt-0.5">
                        Terakhir: {c.last_order_at ? formatDate(c.last_order_at) : '—'}
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full">
                      {days} hari
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Kelola Treatment */}
      <div>
        <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-3">Kelola Treatment</h2>
        <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-extrabold text-[#0d0d0d]">Daftar Treatment</span>
            <Link href="/owner/treatment"
              className="flex items-center gap-1 text-xs font-bold bg-[#fdf0ea] text-[#d4510c] px-3 py-1.5 rounded-lg hover:bg-[#d4510c] hover:text-white transition-all">
              <Plus size={12} /> Kelola
            </Link>
          </div>
          <div className="space-y-0 divide-y divide-[#eceae6]">
            {treatments.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="text-sm font-semibold text-[#0d0d0d] flex-1">{t.name}</span>
                <span className="text-xs font-bold text-[#525252]">{formatRupiah(t.price)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-[#f5f4f1] text-[#8a8a8a]'}`}>
                  {t.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <Toggle value={t.is_active} onChange={v => toggleTreatment(t.id, v)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}