'use client'
import { useState, useEffect } from 'react'
import { OrderTimeline } from './OrderTimeline'
import { StatusBadge } from './StatusBadge'
import { ReceiptPrint } from './ReceiptPrint'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/utils'
import type { OrderWithDetails, OrderStatus } from '@/types'
import { X, Loader2, MessageCircle, Link2, Check, Printer, History } from 'lucide-react'
import {
  fetchOrderStatuses, fetchOrderStatusLogs, logOrderStatusChange,
  DEFAULT_ORDER_STATUSES,
  type OrderStatusConfig, type OrderStatusLog,
} from '@/lib/api'

interface Props {
  order: OrderWithDetails | null
  onClose: () => void
  onStatusChange: (orderId: string, status: string) => Promise<void>
  storePhone?: string
  storeName?: string
  storeAddr?: string
  storeToken?: string
  logoUrl?: string | null
}

// helper: warna badge dari status config
function statusStyle(key: string, statuses: OrderStatusConfig[]) {
  const sc = statuses.find(s => s.key === key)
  if (!sc) return { backgroundColor: '#f5f4f1', color: '#525252' }
  return { backgroundColor: sc.color + '18', color: sc.color }
}

function buildWAUrl(order: OrderWithDetails, storePhone: string, statuses: OrderStatusConfig[]) {
  const steps: any[] = statuses.length > 0 ? statuses : DEFAULT_ORDER_STATUSES
  const sc = steps.find(s => s.key === order.status)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const treatmentList = order.order_items && order.order_items.length > 1
    ? order.order_items.map(i => `${i.treatment_name.split('||')[0]}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')
    : order.order_items?.[0]?.treatment_name.split('||')[0] ?? ''
  const statusDesc = sc?.description ?? order.status
  const msg = `Halo ${order.customers?.name ?? 'Kak'} 👋\n\nPesanan *${order.order_code}* (${treatmentList}) — *${sc?.label ?? order.status}*\n${statusDesc}\n\nCek status: ${baseUrl}/cek-pesanan?kode=${order.order_code}\n\nTerima kasih! 🙏`
  const phone = order.customers?.phone?.replace(/\D/g, '').replace(/^0/, '62') ?? storePhone
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

export function OrderDrawer({ order, onClose, onStatusChange, storePhone = '62812345678', storeName, storeAddr, storeToken, logoUrl }: Props) {
  const [newStatus,   setNewStatus]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [statuses,    setStatuses]    = useState<OrderStatusConfig[]>([])
  const [statusLogs,  setStatusLogs]  = useState<OrderStatusLog[]>([])
  const [logNotes,    setLogNotes]    = useState('')

  useEffect(() => {
    if (order) {
      setNewStatus(order.status)
      setLogNotes('')
      fetchOrderStatuses().then(sc => setStatuses(sc))
      fetchOrderStatusLogs(order.id).then(sl => setStatusLogs(sl))
    }
  }, [order?.id])

  useEffect(() => {
    if (!order) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [order, onClose])

  async function handleSave() {
    if (!order || !newStatus || newStatus === order.status) { onClose(); return }
    setSaving(true)
    // Log perubahan status sebelum apply
    const steps: any[] = statuses.length > 0 ? statuses : DEFAULT_ORDER_STATUSES
    const sc = steps.find(s => s.key === newStatus)
    await logOrderStatusChange({
      order_id:     order.id,
      status_key:   newStatus,
      status_label: sc?.label ?? newStatus,
      notes:        logNotes.trim() || undefined,
    })
    await onStatusChange(order.id, newStatus)
    setSaving(false)
    onClose()
  }

  function copyLink() {
    if (!order) return
    const link = `${window.location.origin}/cek-pesanan?kode=${order.order_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    window.print()
  }

  if (!order) return null

  // status steps dari DB (statuses state)

  return (
    <>
      {/* Overlay hanya untuk mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-[500] lg:hidden"
        onClick={onClose}
      />

      {/* Panel — fixed full viewport height */}
      <div className="fixed top-0 right-0 w-full sm:w-[400px] bg-white z-[501] flex flex-col shadow-2xl border-l border-[#eceae6] animate-slide-in" style={{ height: '100dvh' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#eceae6] bg-gradient-to-br from-[#f8f7f4] to-white flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <div className="font-mono text-xs text-[#8a8a8a] tracking-wider mb-1">{order.order_code}</div>
            <div className="text-lg font-extrabold text-[#0d0d0d] tracking-tight">{order.customers?.name}</div>
            {order.customers?.phone && (
              <div className="text-xs text-[#8a8a8a] font-mono mt-0.5">{order.customers.phone}</div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={order.status} size="sm" />
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-[1.5px] border-[#dddbd5] bg-white hover:bg-[#f5f4f1] transition-colors">
              <X size={14} className="text-[#525252]" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Progress */}
          <section>
            <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Progres Pesanan</p>
            <OrderTimeline status={order.status} size="sm" />
          </section>

          {/* Detail */}
          <section>
            <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Detail Pesanan</p>
            <div className="grid grid-cols-2 gap-2.5">

              {/* Treatment — tampil semua item */}
              {order.order_items && order.order_items.length > 0 && (
                <div className={`${order.order_items.length > 1 ? 'col-span-2' : ''} bg-[#fdf0ea] border border-[#f0c9b0] rounded-xl p-3`}>
                  <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Treatment & Sepatu</div>
                  {order.order_items.length === 1 ? (() => {
                    const [treatName, shoeInfo] = order.order_items[0].treatment_name.split('||')
                    return (
                      <div>
                        <div className="text-sm font-semibold text-[#d4510c]">
                          {treatName}
                          {order.order_items[0].quantity > 1 && (
                            <span className="ml-1.5 text-[11px] text-[#d4510c]/70">× {order.order_items[0].quantity}</span>
                          )}
                        </div>
                        {shoeInfo && <div className="text-[11px] text-[#8a8a8a] mt-0.5">{shoeInfo}</div>}
                      </div>
                    )
                  })() : (
                    <div className="space-y-2">
                      {order.order_items.map((item, i) => {
                        const [treatName, shoeInfo] = item.treatment_name.split('||')
                        return (
                          <div key={item.id} className="flex items-start justify-between gap-2 pb-2 border-b border-[#f0c9b0] last:border-0 last:pb-0">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-[#d4510c]/40 mt-0.5 w-4 flex-shrink-0">{i + 1}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-semibold text-[#d4510c]">{treatName}</span>
                                  {item.quantity > 1 && (
                                    <span className="text-[10px] font-bold text-white bg-[#d4510c] px-1.5 py-0.5 rounded-full flex-shrink-0">×{item.quantity}</span>
                                  )}
                                </div>
                                {shoeInfo && <div className="text-[11px] text-[#8a8a8a] mt-0.5">{shoeInfo}</div>}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#525252] flex-shrink-0">{formatRupiah(item.price * item.quantity)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Total</div>
                <div className="text-sm font-semibold text-[#d4510c]">{formatRupiah(order.total_price)}</div>
              </div>
              <div className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Tanggal Masuk</div>
                <div className="text-sm font-semibold text-[#0d0d0d]">{formatDate(order.created_at)}</div>
              </div>
              <div className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Estimasi Selesai</div>
                <div className="text-sm font-semibold text-[#0d0d0d]">{order.estimated_done_at ? formatDate(order.estimated_done_at) : '-'}</div>
              </div>
              {order.notes && (
                <div className="col-span-2 bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                  <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Catatan</div>
                  <div className="text-sm font-medium text-[#525252]">{order.notes}</div>
                </div>
              )}
            </div>
          </section>

          {/* Detail Sepatu — hanya untuk pesanan lama yang belum pakai format baru */}
          {(order.shoe_brand || order.shoe_type || order.shoe_color) && !order.order_items?.some(i => i.treatment_name.includes('||')) && (
            <section>
              <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Detail Sepatu</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Merek', value: order.shoe_brand },
                  { label: 'Jenis', value: order.shoe_type },
                  { label: 'Warna', value: order.shoe_color },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                    <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">{f.label}</div>
                    <div className="text-sm font-semibold text-[#0d0d0d]">{f.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pembayaran */}
          {order.payment_method && (
            <section>
              <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Pembayaran</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                  <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Metode</div>
                  <div className="text-sm font-semibold text-[#0d0d0d] capitalize">
                    {order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'transfer' ? 'Transfer Bank' : 'QRIS'}
                  </div>
                </div>
                {order.payment_method === 'cash' && order.amount_paid != null && (
                  <>
                    <div className="bg-[#f5f4f1] border border-[#eceae6] rounded-xl p-3">
                      <div className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Dibayar</div>
                      <div className="text-sm font-semibold text-[#0d0d0d]">{formatRupiah(order.amount_paid)}</div>
                    </div>
                    {order.amount_paid > order.total_price && (
                      <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Kembalian</div>
                        <div className="text-sm font-extrabold text-green-700">{formatRupiah(order.amount_paid - order.total_price)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Kirim ke customer */}
          <section>
            <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Notifikasi Customer</p>
            <div className="flex gap-2">
              <a href={buildWAUrl(order, storePhone, statuses)} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-bold rounded-xl border border-green-200 transition-all">
                <MessageCircle size={15} /> Kirim WA
              </a>
              <button onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                  copied
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] border-[#dddbd5]'
                }`}>
                {copied ? <Check size={15} /> : <Link2 size={15} />}
                {copied ? 'Disalin!' : 'Copy Link'}
              </button>
            </div>
            <button onClick={handlePrint}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-white text-sm font-bold rounded-xl border border-[#0d0d0d] transition-all">
              <Printer size={15} /> Cetak Nota
            </button>
          </section>

          {/* Riwayat perubahan status — dari DB */}
          <section>
            <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-3">Riwayat Perubahan</p>
            {statusLogs.length === 0 ? (
              <p className="text-xs text-[#c0bdb8]">Belum ada riwayat perubahan status.</p>
            ) : (
              <div className="space-y-0">
                {[...statusLogs].reverse().map((l, i) => {
                  const sc = statuses.find(s => s.key === l.status_key)
                  const style = sc
                    ? { backgroundColor: sc.color + '18', color: sc.color }
                    : { backgroundColor: '#f5f4f1', color: '#525252' }
                  return (
                    <div key={l.id} className="flex gap-3 pb-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 border-2 border-white shadow"
                          style={{ backgroundColor: sc?.color ?? '#8a8a8a' }} />
                        {i < statusLogs.length - 1 && <div className="w-px flex-1 bg-[#eceae6] mt-1" />}
                      </div>
                      <div className="pb-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={style}>
                            {sc?.icon ?? ''} {l.status_label}
                          </span>
                        </div>
                        {l.notes && <p className="text-xs text-[#525252]">{l.notes}</p>}
                        <div className="text-[10px] text-[#8a8a8a]">{formatDateTime(l.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Ubah status */}
        <div className="border-t border-[#eceae6] p-4 space-y-2.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#525252] flex-shrink-0">Ubah Status:</span>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="flex-1 px-3 py-2 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-semibold bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] cursor-pointer">
              {(statuses.length > 0 ? statuses : DEFAULT_ORDER_STATUSES).map(s => (
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
          <input value={logNotes} onChange={e => setLogNotes(e.target.value)}
            placeholder="Catatan perubahan (opsional)"
            className="w-full px-3 py-2 border-[1.5px] border-[#dddbd5] rounded-xl text-sm bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] placeholder:text-[#c0bdb8]" />
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan & Tutup'}
          </button>
        </div>

        {/* Footer total */}
        <div className="bg-[#0d0d0d] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-white/40 font-semibold">Total Tagihan</span>
          <span className="text-xl font-extrabold text-white tracking-tight">{formatRupiah(order.total_price)}</span>
        </div>
      </div>

      {/* Komponen struk — hanya muncul saat print */}
      <ReceiptPrint
        order={order}
        storeName={storeName}
        storePhone={storePhone}
        storeAddr={storeAddr}
        storeToken={storeToken}
        logoUrl={logoUrl}
      />
    </>
  )
}