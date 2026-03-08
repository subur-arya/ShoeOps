'use client'
import { Skeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { OrderTimeline } from '@/components/ui/OrderTimeline'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatRupiah } from '@/lib/utils'
import {
  fetchOrderByCode, fetchTenantByOrderCode,
  fetchOrderStatusesByTenantId, fetchOrderStatusLogs,
  type OrderStatusConfig, type OrderStatusLog,
} from '@/lib/api'
import type { OrderWithDetails } from '@/types'
import { Search, Shield, Clock, Phone, MapPin, History } from 'lucide-react'

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"

type TenantInfo = { name: string; phone: string; addr: string; logoUrl: string | null; tenantId: string | null }

function CekPesananContent() {
  const searchParams = useSearchParams()
  const [code,       setCode]       = useState('')
  const [result,     setResult]     = useState<OrderWithDetails | null>(null)
  const [tenant,     setTenant]     = useState<TenantInfo | null>(null)
  const [statuses,   setStatuses]   = useState<OrderStatusConfig[]>([])
  const [statusLogs, setStatusLogs] = useState<OrderStatusLog[]>([])
  const [notFound,   setNotFound]   = useState(false)
  const [searched,   setSearched]   = useState(false)
  const [searching,  setSearching]  = useState(false)

  // Auto-search jika ada ?kode= di URL
  useEffect(() => {
    const kode = searchParams.get('kode')
    if (kode) {
      setCode(kode.toUpperCase())
      searchByCode(kode.toUpperCase())
    }
  }, [searchParams])

  async function searchByCode(q: string) {
    if (!q) return
    setSearched(true); setSearching(true)
    setResult(null); setTenant(null); setStatuses([]); setStatusLogs([]); setNotFound(false)

    const [found, tenantInfo] = await Promise.all([fetchOrderByCode(q), fetchTenantByOrderCode(q)])

    if (found) {
      setResult(found)
      setTenant(tenantInfo)
      if (tenantInfo?.tenantId) {
        const [sc, sl] = await Promise.all([
          fetchOrderStatusesByTenantId(tenantInfo.tenantId),
          fetchOrderStatusLogs(found.id),
        ])
        setStatuses(sc)
        setStatusLogs(sl)
      } else {
        setStatusLogs(await fetchOrderStatusLogs(found.id))
      }
    } else {
      setNotFound(true)
    }
    setSearching(false)
  }

  async function search() {
    await searchByCode(code.trim().toUpperCase())
  }

  const waPhone = tenant?.phone?.replace(/\D/g, '').replace(/^0/, '62') ?? '62'

  function getStatusLabel(key: string) {
    if (statuses.length > 0) return statuses.find(s => s.key === key)?.label ?? key
    return key
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#0d0d0d] px-5 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 75% 110%, rgba(212,81,12,.22) 0%, transparent 65%)' }} />
        <div className="relative z-10 max-w-lg w-full py-16 text-center">
          <div className="w-11 h-11 bg-[#d4510c] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#d4510c]/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 17l2-8h14l2 8H2z"/><path d="M4 9c0-3 2-5 5-5 2 0 4 1 5 3"/>
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-white/30 tracking-widest uppercase mb-3">ShoeOps — Layanan Pelanggan</p>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            Cek Status <span className="text-[#e8784a]">Pesanan</span> Anda
          </h1>
          <p className="mt-3 text-sm text-white/40 leading-relaxed">Masukkan kode pesanan untuk melihat progres sepatu Anda secara real-time.</p>
        </div>
      </div>

      {/* Search card */}
      <div className="max-w-lg mx-auto px-4 -mt-11 relative z-10">
        <div className="bg-white rounded-2xl border border-[#eceae6] shadow-xl p-6">
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Kode Pesanan</label>
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Contoh: SO-1241"
              className="flex-1 px-4 py-3 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-mono font-bold tracking-wider bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#c0bdb8]" />
            <button onClick={search} disabled={searching}
              className="px-5 py-3 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all">
              {searching ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : <Search size={15} />}
              Lacak
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-lg mx-auto px-4 mt-5 pb-16">

        {/* Skeleton saat searching */}
        {searching && (
          <div className="bg-white rounded-2xl border border-[#eceae6] shadow-md overflow-hidden animate-pulse">
            <div className="p-4 border-b border-[#eceae6] space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              {/* Timeline */}
              <div className="flex gap-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-2 w-10" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {notFound && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Kode <span className="font-mono font-bold">"{code}"</span> tidak ditemukan. Periksa kembali kode pesanan Anda.
            </p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl border border-[#eceae6] shadow-md overflow-hidden">

            {/* Header toko */}
            {tenant && (
              <div className="px-6 py-4 bg-[#f8f7f4] border-b border-[#eceae6] flex items-center gap-3">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="w-9 h-9 rounded-xl object-contain bg-white border border-[#eceae6] p-0.5" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#d4510c] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 17l2-8h14l2 8H2z"/><path d="M4 9c0-3 2-5 5-5 2 0 4 1 5 3"/>
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-extrabold text-[#0d0d0d]">{tenant.name}</p>
                  {tenant.addr && <p className="text-[11px] text-[#8a8a8a] flex items-center gap-1 mt-0.5"><MapPin size={10} />{tenant.addr}</p>}
                </div>
              </div>
            )}

            {/* Head pesanan */}
            <div className="px-6 py-5 bg-gradient-to-br from-[#f8f7f4] to-white border-b border-[#eceae6] flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-mono text-xs text-[#8a8a8a] tracking-wider">{result.order_code}</p>
                <p className="text-xl font-extrabold text-[#0d0d0d] tracking-tight mt-0.5">{result.customers?.name}</p>
              </div>
              {statuses.length > 0 && <StatusBadge status={result.status} statuses={statuses} />}
            </div>

            {/* Timeline — tunggu sampai statuses loaded */}
            <div className="px-6 py-5 border-b border-[#eceae6]">
              <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-4">Progres Pesanan</p>
              {statuses.length > 0 ? (
                <OrderTimeline status={result.status} statuses={statuses} />
              ) : (
                <div className="text-xs text-[#8a8a8a] text-center py-2">Memuat progres...</div>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 px-6 py-5 border-b border-[#eceae6]">
              {/* Sepatu & treatment — tampil semua */}
              {result.order_items && result.order_items.length > 0 && (
                <div className={`bg-[#fdf0ea] border border-[#f0c9b0] rounded-xl p-3 ${result.order_items.length > 1 ? 'col-span-2' : ''}`}>
                  <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">
                    {result.order_items.length > 1 ? `Sepatu & Treatment (${result.order_items.length} pasang)` : 'Sepatu & Treatment'}
                  </p>
                  {result.order_items.length === 1 ? (() => {
                    const [treatName, shoeInfo] = result.order_items[0].treatment_name.split('||')
                    return (
                      <div>
                        <p className="text-sm font-bold text-[#d4510c]">
                          {treatName}{result.order_items[0].quantity > 1 ? ` ×${result.order_items[0].quantity}` : ''}
                        </p>
                        {shoeInfo && <p className="text-[11px] text-[#8a8a8a] mt-0.5">{shoeInfo}</p>}
                      </div>
                    )
                  })() : (
                    <div className="space-y-2">
                      {result.order_items.map((item, i) => {
                        const [treatName, shoeInfo] = item.treatment_name.split('||')
                        return (
                          <div key={item.id} className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-[#d4510c]/50 mt-0.5 flex-shrink-0">#{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#d4510c]">
                                {treatName}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                              </p>
                              {shoeInfo && <p className="text-[11px] text-[#8a8a8a]">{shoeInfo}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {[
                { l: 'Tanggal Masuk', v: formatDate(result.created_at) },
                { l: 'Est. Selesai',  v: result.estimated_done_at ? formatDate(result.estimated_done_at) : '—' },
                ...(result.notes ? [{ l: 'Catatan', v: result.notes, full: true }] : []),
              ].map((f: any) => (
                <div key={f.l} className={`bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6] ${f.full ? 'col-span-2' : ''}`}>
                  <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">{f.l}</p>
                  <p className={`text-sm font-semibold mt-1 ${f.accent ? 'text-[#d4510c]' : 'text-[#0d0d0d]'}`}>{f.v}</p>
                </div>
              ))}
            </div>

            {/* Riwayat perubahan status */}
            {statusLogs.length > 0 && (
              <div className="px-6 py-5 border-b border-[#eceae6]">
                <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <History size={11} /> Riwayat Status
                </p>
                <div className="space-y-0">
                  {[...statusLogs].reverse().map((log, i) => {
                    const sc = statuses.find(s => s.key === log.status_key)
                    const color = sc?.color ?? '#8a8a8a'
                    return (
                      <div key={log.id} className="flex gap-3 pb-3 relative">
                        {i < statusLogs.length - 1 && (
                          <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-[#eceae6]" />
                        )}
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 border-2"
                          style={{ borderColor: color, backgroundColor: color + '18' }}>
                          <span className="text-[10px]">{sc?.icon ?? '•'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold" style={{ color }}>{log.status_label}</p>
                          {log.notes && <p className="text-[11px] text-[#525252] mt-0.5">{log.notes}</p>}
                          <p className="text-[10px] text-[#8a8a8a] mt-0.5">
                            {new Date(log.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* WA toko */}
            {tenant?.phone && (
              <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-[#eceae6] flex-wrap">
                <p className="text-xs text-[#8a8a8a]">Ada pertanyaan? Hubungi toko kami.</p>
                <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#25d366] hover:bg-[#1da851] text-white text-xs font-bold rounded-xl transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d={WA_PATH}/></svg>
                  WhatsApp {tenant.name}
                </a>
              </div>
            )}

            {/* Total */}
            <div className="px-6 py-4 bg-[#0d0d0d] flex items-center justify-between">
              <span className="text-xs text-white/40 font-semibold">Total Tagihan</span>
              <span className="text-2xl font-extrabold text-white tracking-tight">{formatRupiah(result.total_price)}</span>
            </div>
          </div>
        )}

        {!searched && (
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 bg-[#f5f4f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-[#8a8a8a]" />
            </div>
            <h3 className="text-base font-extrabold text-[#0d0d0d] tracking-tight">Cek status pesanan Anda</h3>
            <p className="text-sm text-[#8a8a8a] mt-2 leading-relaxed">Masukkan kode pesanan yang tertera pada struk dari toko kami.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: Clock,  title: 'Status Real-time', desc: 'Diperbarui setiap ada perubahan' },
            { icon: Shield, title: 'Data Aman',         desc: 'Hanya Anda yang bisa akses' },
            { icon: Phone,  title: 'Hubungi Toko',      desc: 'Siap membantu via WhatsApp' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                <Icon size={14} className="text-[#525252]" />
              </div>
              <p className="text-[11px] font-bold text-[#0d0d0d]">{title}</p>
              <p className="text-[10px] text-[#8a8a8a] mt-0.5 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logo ShoeOps — klik untuk akses portal staff */}
      <div className="pb-8 text-center">
        <a href="/login" className="inline-flex items-center gap-1.5 opacity-20 hover:opacity-60 transition-opacity duration-300" title="Portal Staff">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#525252]">
            <path d="M2 17l2-8h14l2 8H2z"/><path d="M4 9c0-3 2-5 5-5 2 0 4 1 5 3"/>
          </svg>
          <span className="text-[11px] font-extrabold tracking-tight text-[#525252]">
            Shoe<span className="text-[#d4510c]">Ops</span>
          </span>
        </a>
      </div>
    </div>
  )
}

export default function CekPesananPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#d4510c] border-t-transparent rounded-full animate-spin" /></div>}>
      <CekPesananContent />
    </Suspense>
  )
}