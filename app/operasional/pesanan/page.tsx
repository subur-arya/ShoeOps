'use client'
import { OrdersPageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import { OrderDrawer } from '@/components/ui/OrderDrawer'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { fetchOrders, changeOrderStatus, removeOrder, fetchTenantSettings, fetchOrderStatuses } from '@/lib/api'
import type { OrderWithDetails } from '@/types'
import type { OrderStatusConfig } from '@/lib/api'
import { Search, Trash2, MessageCircle, Link2, Check } from 'lucide-react'

export default function OpsListPesananPage() {
  const [orders,     setOrders]     = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statuses,   setStatuses]   = useState<OrderStatusConfig[]>([])
  const [filter,     setFilter]     = useState('Semua')
  const [q,          setQ]          = useState('')
  const [selected,   setSelected]   = useState<OrderWithDetails | null>(null)
  const [delId,      setDelId]      = useState<string | null>(null)
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

  const filtered = useMemo(() => {
    let list = [...orders]
    if (filter !== 'Semua') {
      const sc = statuses.find(s => s.label === filter)
      if (sc) list = list.filter(o => o.status === sc.key)
    }
    if (q) list = list.filter(o =>
      o.order_code.toLowerCase().includes(q.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(q.toLowerCase())
    )
    return list
  }, [orders, statuses, filter, q])

  async function handleStatusChange(orderId: string, status: string) {
    const updated = await changeOrderStatus(orderId, status)
    setOrders(updated)
    if (selected?.id === orderId) setSelected(p => p ? { ...p, status } : null)
    show('Status diperbarui')
  }

  async function handleDelete(id: string) {
    const updated = await removeOrder(id)
    setOrders(updated); setDelId(null)
    if (selected?.id === id) setSelected(null)
    show('Pesanan dihapus')
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
    const treatList = order.order_items && order.order_items.length > 1
      ? order.order_items.map(i => i.treatment_name.split('||')[0]).join(', ')
      : order.order_items?.[0]?.treatment_name.split('||')[0] ?? 'treatment'
    const desc = sc?.description ?? sc?.label ?? order.status
    const msg = `Halo ${order.customers?.name ?? 'Kak'} 👋\n\nPesanan kamu *${order.order_code}* (${treatList}) — *${sc?.label ?? order.status}*\n${desc}\n\nCek status: ${base}/cek-pesanan?kode=${order.order_code}\n\nTerima kasih! 🙏`
    const phone = order.customers?.phone?.replace(/\D/g, '').replace(/^0/, '62') ?? storePhone
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  function stStyle(key: string) {
    const sc = statuses.find(s => s.key === key)
    if (!sc) return { backgroundColor: '#f5f4f1', color: '#525252' }
    return { backgroundColor: sc.color + '18', color: sc.color }
  }

  if (loading) return <OrdersPageSkeleton />

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Daftar Pesanan</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">{orders.length} total pesanan tersimpan</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari kode SO atau nama..."
            className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm bg-white outline-none focus:border-[#d4510c] transition-all" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterTabs.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold transition-all ${filter === f ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]' : 'bg-white text-[#8a8a8a] border-[#dddbd5] hover:border-[#525252]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[80px_1fr_90px_110px_140px_110px_36px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
          {['Kode','Customer','Tanggal','Total','Status','Aksi',''].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-sm text-[#8a8a8a]">{q || filter !== 'Semua' ? 'Tidak ada pesanan yang cocok.' : 'Belum ada pesanan.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {filtered.map(o => delId === o.id ? (
              <div key={o.id} className="grid grid-cols-[80px_1fr_90px_110px_140px_110px_36px] gap-3 items-center px-5 py-3 bg-red-50">
                <span className="font-mono text-xs text-red-400">{o.order_code}</span>
                <p className="text-sm font-bold text-red-700 col-span-4">Hapus pesanan ini?</p>
                <div className="flex gap-2 col-span-2 justify-end">
                  <button onClick={() => handleDelete(o.id)} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">Ya, Hapus</button>
                  <button onClick={() => setDelId(null)} className="px-3 py-1 bg-white border border-[#dddbd5] text-xs font-semibold rounded-lg">Batal</button>
                </div>
              </div>
            ) : (
              <div key={o.id} className="grid grid-cols-[80px_1fr_90px_110px_140px_110px_36px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                <span className="font-mono text-xs text-[#8a8a8a] cursor-pointer" onClick={() => setSelected(o)}>{o.order_code}</span>
                <div className="min-w-0 cursor-pointer" onClick={() => setSelected(o)}>
                  <p className="text-sm font-bold text-[#0d0d0d] truncate">{o.customers?.name}</p>
                  <p className="text-[11px] text-[#8a8a8a] truncate">
                    {o.order_items?.[0]?.treatment_name.split('||')[0]}
                    {o.order_items && o.order_items.length > 1 ? ` +${o.order_items.length - 1}` : ''}
                  </p>
                </div>
                <span className="text-xs text-[#8a8a8a] cursor-pointer" onClick={() => setSelected(o)}>{formatDateShort(o.created_at)}</span>
                <span className="text-sm font-bold text-[#0d0d0d] cursor-pointer" onClick={() => setSelected(o)}>{formatRupiah(o.total_price)}</span>
                <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                  className="text-[11px] font-bold px-2 py-1.5 rounded-lg border-0 outline-none cursor-pointer w-full"
                  style={stStyle(o.status)}>
                  {statuses.length === 0
                    ? <option value={o.status}>{o.status}</option>
                    : statuses.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)
                  }
                </select>
                <div className="flex items-center gap-1">
                  <a href={buildWAMsg(o)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-bold rounded-lg transition-all border border-green-200">
                    <MessageCircle size={11} /> WA
                  </a>
                  <button onClick={() => copyLink(o)}
                    className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${copied === o.id ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] border-[#dddbd5]'}`}>
                    {copied === o.id ? <Check size={11} /> : <Link2 size={11} />}
                    {copied === o.id ? '✓' : 'Link'}
                  </button>
                </div>
                <button onClick={() => setDelId(o.id)} className="p-1.5 text-[#c0bdb8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} />
                </button>
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