'use client'
import { OrdersPageSkeleton } from '@/components/ui/Skeleton'
import { useState, useMemo, useEffect } from 'react'
import { OrderDrawer } from '@/components/ui/OrderDrawer'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { fetchOrders, changeOrderStatus, fetchTenantSettings, fetchOrderStatuses } from '@/lib/api'
import type { OrderWithDetails } from '@/types'
import type { OrderStatusConfig } from '@/lib/api'
import { AlertTriangle, PlusCircle, Clock, MessageCircle, Link2, Check } from 'lucide-react'
import Link from 'next/link'

export default function OperasionalPage() {
  const [orders,     setOrders]     = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statuses,   setStatuses]   = useState<OrderStatusConfig[]>([])
  const [filter,     setFilter]     = useState('Semua')
  const [selected,   setSelected]   = useState<OrderWithDetails | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)
  const [storePhone, setStorePhone] = useState('62812345678')
  const [storeName,  setStoreName]  = useState('')
  const [storeAddr,  setStoreAddr]  = useState('')
  const [storeToken, setStoreToken] = useState('')
  const [logoUrl,    setLogoUrl]    = useState<string | null>(null)
  const { toast, show, hide } = useToast()

  useEffect(() => {
    fetchOrders().then(setOrders)
    fetchOrderStatuses().then(s => { if (s.length > 0) setStatuses(s) })
    fetchTenantSettings().then(info => {
    setLoading(false)
      if (!info) return
      if (info.phone)   setStorePhone(info.phone)
      if (info.name)    setStoreName(info.name)
      if (info.addr)    setStoreAddr(info.addr)
      if (info.logoUrl) setLogoUrl(info.logoUrl)
      try {
        const stored = localStorage.getItem('shoeops_user')
        if (stored) setStoreToken(JSON.parse(stored).tenant_token ?? '')
      } catch {}
    })
  }, [])

  const filterTabs = ['Semua', ...statuses.map(s => s.label)]

  // non-final statuses = "belum selesai"
  const nonFinalKeys = statuses.filter(s => !s.is_final).map(s => s.key)
  const finalKeys    = statuses.filter(s => s.is_final).map(s => s.key)

  const today        = new Date().toISOString().slice(0, 10)
  const todayOrders  = orders.filter(o => o.created_at.startsWith(today))
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total_price, 0)
  const pending      = orders.filter(o => nonFinalKeys.length > 0
    ? nonFinalKeys.includes(o.status)
    : !['selesai','diantar'].includes(o.status)
  ).length

  const filtered = useMemo(() => {
    if (filter === 'Semua') return orders
    if (statuses.length === 0) return orders  // belum load, jangan filter
    const sc = statuses.find(s => s.label === filter)
    if (!sc) return orders
    return orders.filter(o => o.status === sc.key)
  }, [orders, statuses, filter])

  const overdueOrders = orders.filter(o => {
    const isNonFinal = nonFinalKeys.length > 0
      ? nonFinalKeys.includes(o.status)
      : !['selesai','diantar'].includes(o.status)
    if (!isNonFinal) return false
    return (Date.now() - new Date(o.created_at).getTime()) / 86400000 >= 1
  })

  const dueTodayOrders = orders.filter(o => {
    const isFinal = finalKeys.length > 0
      ? finalKeys.includes(o.status)
      : ['selesai','diantar'].includes(o.status)
    if (isFinal) return false
    return o.estimated_done_at?.startsWith(today)
  })

  async function handleStatusChange(orderId: string, status: string) {
    const updated = await changeOrderStatus(orderId, status)
    setOrders(updated)
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null)
    show('Status pesanan diperbarui')
  }

  function copyLink(order: OrderWithDetails) {
    const link = `${window.location.origin}/cek-pesanan?kode=${order.order_code}`
    navigator.clipboard.writeText(link)
    setCopied(order.id); show(`Link ${order.order_code} disalin!`)
    setTimeout(() => setCopied(null), 2000)
  }

  function buildWAMsg(order: OrderWithDetails) {
    const sc = statuses.find(s => s.key === order.status)
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const treatList = order.order_items?.[0]?.treatment_name.split('||')[0] ?? ''
    const desc = sc?.description ?? sc?.label ?? order.status
    const msg = `Halo ${order.customers?.name ?? 'Kak'} 👋\n\nPesanan *${order.order_code}* (${treatList}) — *${sc?.label ?? order.status}*\n${desc}\n\nCek status: ${base}/cek-pesanan?kode=${order.order_code}\n\nTerima kasih! 🙏`
    const phone = order.customers?.phone?.replace(/\D/g, '').replace(/^0/, '62') ?? storePhone
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  function stStyle(key: string) {
    const sc = statuses.find(s => s.key === key)
    if (!sc) return { backgroundColor: '#f5f4f1', color: '#525252' }
    return { backgroundColor: sc.color + '18', color: sc.color }
  }

  // first non-final status label for alert filter button
  const firstNonFinalLabel = statuses.find(s => !s.is_final)?.label ?? 'Semua'

  if (loading) return <OrdersPageSkeleton />

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Operasional Harian</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <Link href="/operasional/input"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all shadow-sm">
          <PlusCircle size={15} /> Input Pesanan
        </Link>
      </div>

      {/* Alerts */}
      {(overdueOrders.length > 0 || dueTodayOrders.length > 0) && (
        <div className="space-y-2">
          {overdueOrders.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-l-[3px] border-l-amber-400 border border-[#dddbd5] rounded-xl">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-[#1f1f1f] flex-1">
                <strong>{overdueOrders.length} pesanan</strong> sudah lebih dari 1 hari belum selesai.
              </span>
              <button onClick={() => setFilter(firstNonFinalLabel)}
                className="text-xs font-bold text-[#d4510c] px-2 py-1 rounded border border-[#dddbd5] hover:bg-[#fdf0ea] transition-colors">
                Lihat
              </button>
            </div>
          )}
          {dueTodayOrders.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-l-[3px] border-l-blue-400 border border-[#dddbd5] rounded-xl">
              <Clock size={13} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs font-medium text-[#1f1f1f] flex-1">
                <strong>{dueTodayOrders.length} pesanan</strong> dijadwalkan selesai hari ini —{' '}
                <span className="text-[#8a8a8a]">{dueTodayOrders.map(o => o.order_code).join(', ')}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Pesanan Hari Ini',    value: todayOrders.length,        col: '' },
          { label: 'Pendapatan',          value: formatRupiah(todayRevenue), col: 'text-[#d4510c]' },
          { label: 'Belum Selesai',       value: pending,                   col: pending > 5 ? 'text-amber-600' : 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#dddbd5] p-2.5 sm:p-4 shadow-sm">
            <div className="text-[9px] sm:text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest leading-tight">{s.label}</div>
            <div className={`text-lg sm:text-2xl font-extrabold tracking-tight mt-1 sm:mt-1.5 truncate ${s.col}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Order list */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-extrabold text-[#0d0d0d]">Daftar Pesanan</h2>
            <span className="text-xs text-[#8a8a8a]">{filtered.length} pesanan</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {filterTabs.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                    : 'bg-white text-[#8a8a8a] border-[#dddbd5] hover:border-[#525252] hover:text-[#0d0d0d]'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-[80px_1fr_110px_110px_120px] gap-2 px-3 mb-1.5">
          {['Kode', 'Customer', 'Status', 'Total', 'Aksi'].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">
            {filter === 'Semua' ? 'Belum ada pesanan.' : `Tidak ada pesanan "${filter}".`}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-xl border-[1.5px] border-[#dddbd5] hover:border-[#d4510c]/40 hover:bg-[#fdf0ea]/30 transition-all">
                {/* Mobile card */}
                <div className="md:hidden px-3 py-3">
                  {/* Baris 1: Nama + Harga */}
                  <div className="flex items-start justify-between gap-2" onClick={() => setSelected(order)}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#0d0d0d] truncate">{order.customers?.name}</div>
                      <div className="text-[11px] text-[#8a8a8a] truncate">
                        {order.order_items?.[0]?.treatment_name.split('||')[0]}
                        {order.order_items && order.order_items.length > 1 ? ` +${order.order_items.length - 1}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-[#d4510c]">{formatRupiah(order.total_price)}</div>
                      <div className="font-mono text-[10px] text-[#8a8a8a]">{order.order_code}</div>
                    </div>
                  </div>
                  {/* Baris 2: Status dropdown */}
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    <select value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="w-full text-[11px] font-bold px-2.5 py-1.5 rounded-lg border-0 outline-none cursor-pointer"
                      style={stStyle(order.status)}>
                      {statuses.length === 0
                        ? <option value={order.status}>{order.status}</option>
                        : statuses.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                    </select>
                  </div>
                  {/* Baris 3: Tombol aksi */}
                  <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    <a href={buildWAMsg(order)} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-200">
                      <MessageCircle size={12} /> Kirim WA
                    </a>
                    <button onClick={() => copyLink(order)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border ${
                        copied === order.id ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-[#f5f4f1] text-[#525252] border-[#dddbd5]'
                      }`}>
                      {copied === order.id ? <Check size={12} /> : <Link2 size={12} />}
                      {copied === order.id ? 'Link Disalin' : 'Salin Link'}
                    </button>
                  </div>
                </div>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[80px_1fr_110px_110px_120px] gap-2 items-center px-3 py-3">
                  <span className="font-mono text-xs text-[#8a8a8a] cursor-pointer" onClick={() => setSelected(order)}>
                    {order.order_code}
                  </span>
                  <div className="min-w-0 cursor-pointer" onClick={() => setSelected(order)}>
                    <div className="text-sm font-bold text-[#0d0d0d] truncate">{order.customers?.name}</div>
                    <div className="text-[11px] text-[#8a8a8a] truncate">
                      {order.order_items?.[0]?.treatment_name.split('||')[0]}
                      {order.order_items && order.order_items.length > 1 ? ` +${order.order_items.length - 1}` : ''}
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <select value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border-0 outline-none cursor-pointer"
                      style={stStyle(order.status)}>
                      {statuses.length === 0
                        ? <option value={order.status}>{order.status}</option>
                        : statuses.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                    </select>
                  </div>
                  <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(order.total_price)}</span>
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <a href={buildWAMsg(order)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-bold rounded-lg transition-all border border-green-200">
                      <MessageCircle size={12} /> WA
                    </a>
                    <button onClick={() => copyLink(order)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${
                        copied === order.id ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] border-[#dddbd5]'
                      }`}>
                      {copied === order.id ? <Check size={12} /> : <Link2 size={12} />}
                      {copied === order.id ? 'Disalin' : 'Link'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OrderDrawer
        order={selected} onClose={() => setSelected(null)}
        onStatusChange={async (id, status) => { handleStatusChange(id, status); setSelected(null) }}
        storePhone={storePhone} storeName={storeName} storeAddr={storeAddr} storeToken={storeToken} logoUrl={logoUrl}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}