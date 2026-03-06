'use client'
import { StokSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { fetchMaterials, saveMaterial, editMaterial, removeMaterial, stockIn, stockAdjust, fetchStockLogs, fetchMaterialUsages } from '@/lib/api'
import type { Material, StockLog } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Plus, Package, AlertTriangle, TrendingDown, TrendingUp, Edit2, Trash2, X, ChevronDown, ChevronRight, History } from 'lucide-react'

const UNITS = ['pcs', 'ml', 'liter', 'gram', 'kg', 'botol', 'sachet', 'lembar', 'roll']

type Modal = 
  | { type: 'add' }
  | { type: 'edit'; material: Material }
  | { type: 'stockin'; material: Material }
  | { type: 'adjust'; material: Material }
  | { type: 'log'; material: Material }
  | null

export default function StokPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [logs,      setLogs]      = useState<StockLog[]>([])
  const [modal,     setModal]     = useState<Modal>(null)
  const [loading,   setLoading]   = useState(true)
  const [expandLog, setExpandLog] = useState<string | null>(null)

  // Form states
  const [fName,  setFName]  = useState('')
  const [fUnit,  setFUnit]  = useState('pcs')
  const [fStock, setFStock] = useState('')
  const [fMin,   setFMin]   = useState('')
  const [fCost,  setFCost]  = useState('')
  const [fQty,   setFQty]   = useState('')
  const [fNote,  setFNote]  = useState('')
  const [fPrice, setFPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [mats, lg] = await Promise.all([fetchMaterials(), fetchStockLogs()])
    setMaterials(mats)
    setLogs(lg)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setFName(''); setFUnit('pcs'); setFStock(''); setFMin(''); setFCost('')
    setModal({ type: 'add' })
  }

  function openEdit(m: Material) {
    setFName(m.name); setFUnit(m.unit); setFStock(String(m.stock)); setFMin(String(m.min_stock)); setFCost(String(m.cost_per_unit))
    setModal({ type: 'edit', material: m })
  }

  function openStockIn(m: Material) {
    setFQty(''); setFNote(''); setModal({ type: 'stockin', material: m })
  }

  function openAdjust(m: Material) {
    setFQty(String(m.stock)); setFNote(''); setModal({ type: 'adjust', material: m })
  }

  async function handleSave() {
    if ((modal?.type === 'add' || modal?.type === 'edit') && !fName.trim()) return
    setSaving(true)
    try {
      if (modal?.type === 'add') {
        await saveMaterial({ name: fName.trim(), unit: fUnit, stock: parseFloat(fStock) || 0, min_stock: parseFloat(fMin) || 0, cost_per_unit: parseFloat(fCost) || 0 })
      } else if (modal?.type === 'edit') {
        await editMaterial(modal.material.id, { name: fName.trim(), unit: fUnit, min_stock: parseFloat(fMin) || 0, cost_per_unit: parseFloat(fCost) || 0 })
      } else if (modal?.type === 'stockin') {
        const price = fPrice ? parseFloat(fPrice) : undefined
        await stockIn((modal as any).material.id, parseFloat(fQty) || 0, fNote, price)
      } else if (modal?.type === 'adjust') {
        await stockAdjust((modal as any).material.id, parseFloat(fQty) || 0, fNote)
      }
      setModal(null)
      await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus bahan ini?')) return
    await removeMaterial(id)
    await load()
  }

  const lowStock = materials.filter(m => m.stock <= m.min_stock && m.min_stock > 0)
  const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8]"

  function stockColor(m: Material) {
    if (m.min_stock > 0 && m.stock <= m.min_stock) return 'text-red-600'
    if (m.min_stock > 0 && m.stock <= m.min_stock * 2) return 'text-amber-500'
    return 'text-green-600'
  }

  function stockBg(m: Material) {
    if (m.min_stock > 0 && m.stock <= m.min_stock) return 'bg-red-50 border-red-200'
    if (m.min_stock > 0 && m.stock <= m.min_stock * 2) return 'bg-amber-50 border-amber-200'
    return 'bg-green-50 border-green-200'
  }

  const modalMat = modal && 'material' in modal ? modal.material : null

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Stok Bahan Baku</h1>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Kelola bahan baku & pantau stok toko</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
            <Plus size={15} /> Tambah Bahan
          </button>
        </div>

        {/* Warning stok rendah */}
        {lowStock.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={15} className="text-red-500" />
              <span className="text-sm font-bold text-red-700">{lowStock.length} bahan hampir habis!</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(m => (
                <span key={m.id} className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-lg">
                  {m.name} — {m.stock} {m.unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Daftar bahan */}
        {loading ? (
          <StokSkeleton />
        ) : materials.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
            <Package size={32} className="mx-auto text-[#c0bdb8] mb-3" />
            <p className="text-sm font-semibold text-[#8a8a8a]">Belum ada bahan baku</p>
            <p className="text-xs text-[#c0bdb8] mt-1">Klik "Tambah Bahan" untuk mulai</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map(m => {
              const matLogs = logs.filter(l => l.material_id === m.id).slice(0, 5)
              const isExpanded = expandLog === m.id
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-[#dddbd5] overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#0d0d0d]">{m.name}</span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${stockBg(m)} ${stockColor(m)}`}>
                            {m.stock} {m.unit}
                          </span>
                          {m.min_stock > 0 && m.stock <= m.min_stock && (
                            <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                              <AlertTriangle size={11} /> Hampir habis
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-[#8a8a8a]">Min: {m.min_stock} {m.unit}</span>
                          {m.cost_per_unit > 0 && (
                            <span className="text-[11px] text-[#8a8a8a]">{formatRupiah(m.cost_per_unit)}/{m.unit}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => openStockIn(m)} title="Tambah stok"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200 transition-all">
                          <TrendingUp size={12} /> Isi
                        </button>
                        <button onClick={() => openAdjust(m)} title="Koreksi stok"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] text-xs font-bold rounded-lg border border-[#dddbd5] transition-all">
                          <TrendingDown size={12} /> Koreksi
                        </button>
                        <button onClick={() => openEdit(m)}
                          className="p-1.5 hover:bg-[#f5f4f1] text-[#8a8a8a] hover:text-[#0d0d0d] rounded-lg transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(m.id)}
                          className="p-1.5 hover:bg-red-50 text-[#8a8a8a] hover:text-red-500 rounded-lg transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Riwayat toggle */}
                  {matLogs.length > 0 && (
                    <>
                      <button
                        onClick={() => setExpandLog(isExpanded ? null : m.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-[#f5f4f1] hover:bg-[#eceae6] text-[#8a8a8a] text-[11px] font-semibold border-t border-[#eceae6] transition-all">
                        <History size={11} />
                        Riwayat perubahan
                        {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-[#f5f4f1]">
                          {matLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.type === 'in' ? 'bg-green-500' : log.type === 'out' ? 'bg-red-400' : 'bg-amber-400'}`} />
                                <div className="min-w-0">
                                  <span className="text-xs text-[#525252]">
                                    {log.type === 'in' ? 'Isi stok' : log.type === 'out' ? 'Pemakaian' : 'Koreksi'}
                                    {log.note ? ` — ${log.note}` : ''}
                                  </span>
                                  {log.changed_by && (
                                    <span className="ml-2 text-[10px] text-[#8a8a8a] bg-[#f5f4f1] px-1.5 py-0.5 rounded">
                                      👤 {log.changed_by}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-xs font-bold ${log.qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {log.qty > 0 ? '+' : ''}{log.qty} {m.unit}
                                </span>
                                <span className="text-[10px] text-[#c0bdb8]">
                                  {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6]">
              <h3 className="font-extrabold text-[#0d0d0d]">
                {modal.type === 'add' ? 'Tambah Bahan Baru' :
                 modal.type === 'edit' ? 'Edit Bahan' :
                 modal.type === 'stockin' ? `Isi Stok — ${modalMat?.name}` :
                 `Koreksi Stok — ${modalMat?.name}`}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg">
                <X size={16} className="text-[#8a8a8a]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(modal.type === 'add' || modal.type === 'edit') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Bahan *</label>
                    <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Sabun, Sikat, Cairan, dll" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Satuan</label>
                      <select value={fUnit} onChange={e => setFUnit(e.target.value)} className={`${inputCls} cursor-pointer`}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Stok Awal</label>
                      <input value={fStock} onChange={e => setFStock(e.target.value)} placeholder="0" inputMode="decimal"
                        className={`${inputCls} ${modal.type === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={modal.type === 'edit'} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Stok Minimum</label>
                      <input value={fMin} onChange={e => setFMin(e.target.value)} placeholder="0" inputMode="decimal" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Harga/Satuan</label>
                      <input value={fCost} onChange={e => setFCost(e.target.value)} placeholder="0" inputMode="decimal" className={inputCls} />
                    </div>
                  </div>
                </>
              )}

              {(modal.type === 'stockin' || modal.type === 'adjust') && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f5f4f1] rounded-xl">
                    <span className="text-sm text-[#525252]">Stok saat ini</span>
                    <span className="font-extrabold text-[#0d0d0d]">{modalMat?.stock} {modalMat?.unit}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                      {modal.type === 'stockin' ? `Jumlah Masuk (${modalMat?.unit})` : `Stok Baru (${modalMat?.unit})`}
                    </label>
                    <input value={fQty} onChange={e => setFQty(e.target.value)} placeholder="0" inputMode="decimal" className={inputCls} autoFocus />
                    {modal.type === 'stockin' && parseFloat(fQty) > 0 && (
                      <p className="text-xs text-green-600 font-semibold mt-1.5">
                        Stok akan menjadi: {(modalMat?.stock ?? 0) + parseFloat(fQty)} {modalMat?.unit}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Keterangan</label>
                    <input value={fNote} onChange={e => setFNote(e.target.value)} placeholder="Restock, koreksi, dll" className={inputCls} />
                  </div>
                  {modal.type === 'stockin' && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Total harga beli (opsional)</label>
                      <input value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="Contoh: 50000 — otomatis masuk pengeluaran" inputMode="decimal" className={inputCls} />
                      {fPrice && parseFloat(fPrice) > 0 && (
                        <p className="text-[11px] text-[#d4510c] font-semibold mt-1">💸 Akan tercatat sebagai pengeluaran: Rp{parseInt(fPrice).toLocaleString('id-ID')}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}