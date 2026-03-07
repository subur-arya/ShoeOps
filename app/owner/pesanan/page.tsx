'use client'
import { OrdersPageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import { OrderDrawer } from '@/components/ui/OrderDrawer'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { fetchOrders, changeOrderStatus, fetchTenantSettings, fetchOrderStatuses } from '@/lib/api'
import type { OrderWithDetails } from '@/types'
import type { OrderStatusConfig } from '@/lib/api'
import { Search } from 'lucide-react'

export default function OwnerPesananPage() {
  const [orders,   setOrders]   = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<OrderStatusConfig[]>([])
  const [filter,   setFilter]   = useState('Semua')
  const [q,        setQ]        = useState('')
  const [selected, setSelected] = useState<OrderWithDetails | null>(null)
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
      o.customers?.name?.toLowerCase().includes(q.toLowerCase())
    )
    return list
  }, [orders, statuses, filter, q])

  const totalRev = filtered.reduce((s, o) => s + o.total_price, 0)

  async function handleStatusChange(orderId: string, status: string) {
    const updated = await changeOrderStatus(orderId, status)
    setOrders(updated)
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null)
    show('Status diperbarui')
  }

  function stStyle(key: string) {
    const sc = statuses.find(s => s.key === key)
    if (!sc) return { backgroundColor: '#f5f4f1', color: '#525252' }
    return { backgroundColor: sc.color + '18', color: sc.color }
  }

  function stLabel(key: string) {
    const sc = statuses.find(s => s.key === key)
    return sc ? `${sc.icon} ${sc.label}` : key
  }

  if (loading) return <OrdersPageSkeleton />

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Semua Pesanan</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">{orders.length} total pesanan</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode atau nama customer..."
            className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] transition-all" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filterTabs.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold transition-all ${filter === f ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]' : 'bg-white text-[#8a8a8a] border-[#dddbd5] hover:border-[#525252]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 bg-white border border-[#dddbd5] rounded-xl text-sm">
        <span className="text-[#8a8a8a]">Menampilkan <strong className="text-[#0d0d0d]">{filtered.length}</strong> pesanan</span>
        <span className="text-[#8a8a8a]">·</span>
        <span className="text-[#8a8a8a]">Total <strong className="text-[#d4510c]">{formatRupiah(totalRev)}</strong></span>
      </div>

      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[80px_1fr_90px_110px_130px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
          {['Kode','Customer','Tanggal','Total','Status'].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-[#8a8a8a]">Tidak ada pesanan.</p>
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {filtered.map(o => (
              <div key={o.id} onClick={() => setSelected(o)}
                className="cursor-pointer hover:bg-[#fdf9f7] transition-colors">
                {/* Mobile card */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0d0d0d] truncate">{o.customers?.name}</p>
                      <p className="text-[11px] text-[#8a8a8a] truncate mt-0.5">
                        {o.order_items?.[0]?.treatment_name.split('||')[0]}
                        {o.order_items && o.order_items.length > 1 ? ` +${o.order_items.length - 1}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={stStyle(o.status)}>
                      {stLabel(o.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-[11px] text-[#8a8a8a]">{o.order_code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8a8a8a]">{formatDateShort(o.created_at)}</span>
                      <span className="text-sm font-bold text-[#d4510c]">{formatRupiah(o.total_price)}</span>
                    </div>
                  </div>
                </div>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[80px_1fr_90px_110px_130px] gap-3 items-center px-5 py-3">
                  <span className="font-mono text-xs text-[#8a8a8a]">{o.order_code}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0d0d0d] truncate">{o.customers?.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate">
                      {o.order_items?.[0]?.treatment_name.split('||')[0]}
                      {o.order_items && o.order_items.length > 1 ? ` +${o.order_items.length - 1}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-[#8a8a8a]">{formatDateShort(o.created_at)}</span>
                  <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(o.total_price)}</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-center" style={stStyle(o.status)}>
                    {stLabel(o.status)}
                  </span>
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