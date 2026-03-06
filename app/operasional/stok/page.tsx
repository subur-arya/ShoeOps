'use client'
import { StokSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { fetchMaterials, fetchEquipment, fetchStockLogs, stockIn, stockAdjust } from '@/lib/api'
import { Toast, useToast } from '@/components/ui/Toast'
import type { Material, StockLog } from '@/types'
import type { Equipment } from '@/lib/api'
import { Package, Wrench, AlertTriangle, CheckCircle, XCircle, Clock, Plus, SlidersHorizontal, History, ChevronDown, ChevronUp, User } from 'lucide-react'

function StockBar({ stock, min }: { stock: number; min: number }) {
  const pct = min > 0 ? Math.min((stock / (min * 2)) * 100, 100) : 100
  const color = stock <= 0 ? '#ef4444' : stock <= min ? '#f59e0b' : '#16a34a'
  return (
    <div className="w-full h-1.5 bg-[#eceae6] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function ConditionBadge({ condition }: { condition: Equipment['condition'] }) {
  const map = {
    baru:         { label: 'Baru',         color: '#2563eb', icon: <CheckCircle size={11} /> },
    baik:         { label: 'Baik',         color: '#16a34a', icon: <CheckCircle size={11} /> },
    perlu_servis: { label: 'Perlu Servis', color: '#f59e0b', icon: <Clock size={11} />       },
    rusak:        { label: 'Rusak',        color: '#ef4444', icon: <XCircle size={11} />     },
  }
  const cfg = map[condition] ?? map.baik
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.color + '18', color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

type Modal =
  | { type: 'in';     mat: Material }
  | { type: 'adjust'; mat: Material }
  | null

export default function OpsStokPage() {
  const [materials,  setMaterials]  = useState<Material[]>([])
  const [equipment,  setEquipment]  = useState<Equipment[]>([])
  const [logs,       setLogs]       = useState<StockLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<'bahan' | 'alat'>('bahan')
  const [modal,      setModal]      = useState<Modal>(null)
  const [expandLog,  setExpandLog]  = useState<string | null>(null)
  const [qty,        setQty]        = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [newStock,   setNewStock]   = useState('')
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const { toast, show, hide } = useToast()

  async function load() {
    const [m, e, l] = await Promise.all([fetchMaterials(), fetchEquipment(), fetchStockLogs()])
    setMaterials(m); setEquipment(e); setLogs(l); setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openIn(mat: Material) {
    setModal({ type: 'in', mat }); setQty(''); setTotalPrice(''); setNote('')
  }
  function openAdjust(mat: Material) {
    setModal({ type: 'adjust', mat }); setNewStock(String(mat.stock)); setNote('')
  }

  async function handleSubmit() {
    if (!modal) return
    setSaving(true)
    try {
      if (modal.type === 'in') {
        const q = parseFloat(qty)
        if (!q || q <= 0) { show('Jumlah harus lebih dari 0', 'error'); setSaving(false); return }
        const price = totalPrice ? parseFloat(totalPrice) : undefined
        await stockIn(modal.mat.id, q, note || `Tambah stok ${modal.mat.name}`, price)
        show(`✓ Stok ${modal.mat.name} +${q} ${modal.mat.unit}${price ? ' · pengeluaran tercatat' : ''}`)
      } else {
        const ns = parseFloat(newStock)
        if (isNaN(ns) || ns < 0) { show('Stok tidak valid', 'error'); setSaving(false); return }
        await stockAdjust(modal.mat.id, ns, note || `Koreksi stok ${modal.mat.name}`)
        show(`✓ Stok ${modal.mat.name} dikoreksi ke ${ns} ${modal.mat.unit}`)
      }
      setModal(null)
      load()
    } catch (e) {
      show('Gagal menyimpan', 'error')
    }
    setSaving(false)
  }

  const habis   = materials.filter(m => m.stock <= 0)
  const menipis = materials.filter(m => m.stock > 0 && m.stock <= m.min_stock)
  const aman    = materials.filter(m => m.stock > m.min_stock)

  const alatRusak  = equipment.filter(e => e.condition === 'rusak')
  const alatServis = equipment.filter(e => e.condition === 'perlu_servis')
  const alatOke    = equipment.filter(e => e.condition === 'baru' || e.condition === 'baik')

  const hasAlert = habis.length > 0 || menipis.length > 0 || alatRusak.length > 0 || alatServis.length > 0

  function logsFor(matId: string) {
    return logs.filter(l => l.material_id === matId)
  }

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Stok & Kondisi Alat</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">Kelola stok bahan baku dan pantau kondisi peralatan</p>
      </div>

      {/* Alert */}
      {!loading && hasAlert && (
        <div className="space-y-2">
          {habis.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-l-[3px] border-l-red-500 border border-red-200 rounded-xl">
              <XCircle size={13} className="text-red-500 flex-shrink-0" />
              <span className="text-xs font-medium text-red-800">
                <strong>{habis.length} bahan habis:</strong> {habis.map(m => m.name).join(', ')}
              </span>
            </div>
          )}
          {menipis.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-l-[3px] border-l-amber-400 border border-amber-200 rounded-xl">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-800">
                <strong>{menipis.length} bahan menipis:</strong> {menipis.map(m => m.name).join(', ')}
              </span>
            </div>
          )}
          {alatRusak.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-l-[3px] border-l-red-500 border border-red-200 rounded-xl">
              <XCircle size={13} className="text-red-500 flex-shrink-0" />
              <span className="text-xs font-medium text-red-800">
                <strong>{alatRusak.length} alat rusak:</strong> {alatRusak.map(e => e.name).join(', ')}
              </span>
            </div>
          )}
          {alatServis.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-l-[3px] border-l-amber-400 border border-amber-200 rounded-xl">
              <Clock size={13} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-800">
                <strong>{alatServis.length} alat perlu servis:</strong> {alatServis.map(e => e.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Bahan Baku</div>
            <div className="flex items-end gap-2 mt-1.5">
              <span className="text-2xl font-extrabold text-[#0d0d0d]">{aman.length}</span>
              <span className="text-xs text-[#8a8a8a] mb-0.5">/ {materials.length} aman</span>
            </div>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {menipis.length > 0 && <span className="text-[10px] font-bold text-amber-600">⚠ {menipis.length} menipis</span>}
              {habis.length > 0   && <span className="text-[10px] font-bold text-red-600">✕ {habis.length} habis</span>}
              {habis.length === 0 && menipis.length === 0 && <span className="text-[10px] font-bold text-green-600">✓ Semua aman</span>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
            <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Peralatan</div>
            <div className="flex items-end gap-2 mt-1.5">
              <span className="text-2xl font-extrabold text-[#0d0d0d]">{alatOke.length}</span>
              <span className="text-xs text-[#8a8a8a] mb-0.5">/ {equipment.length} siap</span>
            </div>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {alatServis.length > 0 && <span className="text-[10px] font-bold text-amber-600">⚠ {alatServis.length} servis</span>}
              {alatRusak.length > 0  && <span className="text-[10px] font-bold text-red-600">✕ {alatRusak.length} rusak</span>}
              {alatRusak.length === 0 && alatServis.length === 0 && <span className="text-[10px] font-bold text-green-600">✓ Semua siap</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1.5">
        {(['bahan', 'alat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-[1.5px] text-sm font-semibold transition-all ${tab === t ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]' : 'bg-white text-[#8a8a8a] border-[#dddbd5]'}`}>
            {t === 'bahan' ? <Package size={14} /> : <Wrench size={14} />}
            {t === 'bahan' ? 'Bahan Baku' : 'Peralatan'}
            {t === 'bahan' && (habis.length > 0 || menipis.length > 0) && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
            {t === 'alat'  && (alatRusak.length > 0 || alatServis.length > 0) && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>

      {loading ? (
        <StokSkeleton />
      ) : tab === 'bahan' ? (
        /* ── BAHAN BAKU ── */
        <div className="space-y-2">
          {materials.length === 0 ? (
            <div className="text-center py-14 text-sm text-[#8a8a8a]">Belum ada data bahan baku.</div>
          ) : materials.map(m => {
            const isHabis   = m.stock <= 0
            const isMenipis = m.stock > 0 && m.stock <= m.min_stock
            const mLogs     = logsFor(m.id)
            const isExpanded = expandLog === m.id
            return (
              <div key={m.id} className={`bg-white rounded-2xl border-[1.5px] overflow-hidden transition-all ${isHabis ? 'border-red-300' : isMenipis ? 'border-amber-300' : 'border-[#dddbd5]'}`}>
                {/* Row utama */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#0d0d0d]">{m.name}</p>
                        {isHabis   && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Habis</span>}
                        {isMenipis && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Menipis</span>}
                        {!isHabis && !isMenipis && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Aman</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xl font-extrabold ${isHabis ? 'text-red-600' : isMenipis ? 'text-amber-600' : 'text-[#0d0d0d]'}`}>
                          {m.stock}
                        </span>
                        <span className="text-xs text-[#8a8a8a]">{m.unit}</span>
                        <span className="text-[11px] text-[#c0bdb8]">min: {m.min_stock}</span>
                      </div>
                      <div className="mt-2 max-w-[200px]">
                        <StockBar stock={m.stock} min={m.min_stock} />
                      </div>
                    </div>
                    {/* Aksi */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => openIn(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-[11px] font-bold rounded-lg transition-all">
                        <Plus size={11} /> Tambah
                      </button>
                      <button onClick={() => openAdjust(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] text-[11px] font-bold rounded-lg transition-all border border-[#dddbd5]">
                        <SlidersHorizontal size={11} /> Koreksi
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle history */}
                <button onClick={() => setExpandLog(isExpanded ? null : m.id)}
                  className="w-full flex items-center justify-between px-5 py-2.5 bg-[#f8f7f4] border-t border-[#eceae6] text-[11px] font-semibold text-[#8a8a8a] hover:bg-[#eceae6] transition-colors">
                  <span className="flex items-center gap-1.5"><History size={11} /> Riwayat ({mLogs.length})</span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* History */}
                {isExpanded && (
                  <div className="border-t border-[#eceae6]">
                    {mLogs.length === 0 ? (
                      <p className="text-xs text-[#8a8a8a] text-center py-4">Belum ada riwayat.</p>
                    ) : (
                      <div className="divide-y divide-[#eceae6]">
                        {mLogs.map(log => {
                          const isIn     = log.type === 'in'
                          const isAdjust = log.type === 'adjust'
                          const isOut    = log.type === 'out'
                          const color    = isIn ? '#16a34a' : isOut ? '#ef4444' : '#2563eb'
                          const sign     = isIn ? '+' : isOut ? '-' : '±'
                          return (
                            <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-extrabold"
                                style={{ backgroundColor: color + '18', color }}>
                                {sign}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold" style={{ color }}>
                                    {isAdjust ? `Koreksi ke ${(log.qty >= 0 ? m.stock : m.stock)}` : `${sign}${Math.abs(log.qty)} ${m.unit}`}
                                  </span>
                                  <span className="text-[10px] text-[#8a8a8a] capitalize px-1.5 py-0.5 bg-[#f5f4f1] rounded">
                                    {isIn ? 'Tambah' : isOut ? 'Keluar' : 'Koreksi'}
                                  </span>
                                </div>
                                {log.note && <p className="text-[11px] text-[#525252] mt-0.5">{log.note}</p>}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[10px] text-[#8a8a8a]">
                                    {new Date(log.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                  </span>
                                  {log.changed_by && (
                                    <span className="flex items-center gap-1 text-[10px] text-[#8a8a8a]">
                                      <User size={9} /> {log.changed_by}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── PERALATAN ── */
        <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_100px] gap-4 px-5 py-2.5 bg-[#f8f7f4] border-b border-[#eceae6]">
            {['Peralatan', 'Merek', 'Kondisi'].map(h => (
              <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {equipment.length === 0 ? (
            <div className="text-center py-14 text-sm text-[#8a8a8a]">Belum ada data peralatan.</div>
          ) : (
            <div className="divide-y divide-[#eceae6]">
              {equipment.map(e => (
                <div key={e.id} className={`grid grid-cols-[1fr_120px_100px] gap-4 items-center px-5 py-3.5 ${e.condition === 'rusak' ? 'bg-red-50' : e.condition === 'perlu_servis' ? 'bg-amber-50' : ''}`}>
                  <div>
                    <p className="text-sm font-bold text-[#0d0d0d]">{e.name}</p>
                    {e.notes && <p className="text-[11px] text-[#8a8a8a] mt-0.5 truncate">{e.notes}</p>}
                  </div>
                  <span className="text-sm text-[#8a8a8a]">{e.brand || '—'}</span>
                  <ConditionBadge condition={e.condition} />
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#c0bdb8] text-center py-3 border-t border-[#eceae6]">
            Perubahan kondisi alat dilakukan oleh owner.
          </p>
        </div>
      )}

      {/* Modal tambah / koreksi */}
      {modal && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0d0d0d]">
                {modal.type === 'in' ? '➕ Tambah Stok' : '⚖️ Koreksi Stok'}
              </h3>
              <p className="text-xs text-[#8a8a8a] mt-0.5">{modal.mat.name} — stok saat ini: <strong>{modal.mat.stock} {modal.mat.unit}</strong></p>
            </div>

            {modal.type === 'in' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Jumlah yang ditambah ({modal.mat.unit})</label>
                  <input type="number" min="0.01" step="any" value={qty} onChange={e => setQty(e.target.value)}
                    placeholder="Contoh: 5"
                    className="mt-1.5 w-full px-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm outline-none focus:border-[#d4510c] transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Total harga beli (opsional)</label>
                  <input type="number" min="0" step="any" value={totalPrice} onChange={e => setTotalPrice(e.target.value)}
                    placeholder="Contoh: 50000 — otomatis masuk pengeluaran"
                    className="mt-1.5 w-full px-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm outline-none focus:border-[#d4510c] transition-all" />
                  {totalPrice && parseFloat(totalPrice) > 0 && (
                    <p className="text-[10px] text-[#d4510c] mt-1">💸 Akan tercatat sebagai pengeluaran: Rp{parseInt(totalPrice).toLocaleString('id-ID')}</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Stok aktual sekarang ({modal.mat.unit})</label>
                <input type="number" min="0" step="any" value={newStock} onChange={e => setNewStock(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm outline-none focus:border-[#d4510c] transition-all" />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Catatan (opsional)</label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder={modal.type === 'in' ? 'Contoh: Beli di toko X' : 'Contoh: Hasil hitung fisik'}
                className="mt-1.5 w-full px-4 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm outline-none focus:border-[#d4510c] transition-all" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-semibold text-[#525252] hover:bg-[#f5f4f1] transition-all">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}