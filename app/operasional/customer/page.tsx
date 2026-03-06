'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { fetchCustomers, fetchOrders } from '@/lib/api'
import type { Customer } from '@/types'
import { Search, Phone } from 'lucide-react'
import { differenceInDays } from 'date-fns'

export default function OpsCustomerPage() {
  const [customers, setCustomers] = useState<(Customer & { totalSpend: number; daysSince: number | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    async function load() {
      const [raw, orders] = await Promise.all([fetchCustomers(), fetchOrders()])
      const now = new Date()
      const enriched = raw.map(c => {
        const cOrders = orders.filter(o => o.customer_id === c.id)
        const totalSpend = cOrders.reduce((s, o) => s + o.total_price, 0)
        const daysSince = c.last_order_at ? differenceInDays(now, new Date(c.last_order_at)) : null
        return { ...c, totalSpend, daysSince }
      }).sort((a, b) => b.total_orders - a.total_orders)
      setCustomers(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q)
  )

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Data Customer</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">{customers.length} customer terdaftar</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau nomor HP..."
          className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_100px_90px] gap-3 px-5 py-2.5 border-b border-[#eceae6] bg-[#f8f7f4]">
          {['Customer', 'Pesanan', 'Total Spend', 'Terakhir'].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm text-[#8a8a8a]">Belum ada customer.</p>
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {filtered.map(c => (
              <div key={c.id} className="grid grid-cols-[1fr_70px_100px_90px] gap-3 items-center px-5 py-3 hover:bg-[#fdf9f7] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f4f1] flex items-center justify-center text-xs font-extrabold text-[#525252] flex-shrink-0">
                    {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0d0d0d] truncate">{c.name}</p>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] text-[#8a8a8a] hover:text-[#d4510c] transition-colors">
                        <Phone size={10} />{c.phone}
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[#0d0d0d]">{c.total_orders}x</span>
                <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(c.totalSpend)}</span>
                <span className="text-xs text-[#8a8a8a]">
                  {c.daysSince === null ? '—' : c.daysSince === 0 ? 'Hari ini' : c.daysSince === 1 ? 'Kemarin' : `${c.daysSince} hr lalu`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}