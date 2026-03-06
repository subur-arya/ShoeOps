'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  fetchOrderStatuses, saveOrderStatus, editOrderStatus, removeOrderStatus,
  initDefaultOrderStatuses,
  type OrderStatusConfig,
} from '@/lib/api'
import { ChevronLeft, Plus, X, Edit2, Trash2, GripVertical, CheckCircle, Info } from 'lucide-react'

const ICON_OPTIONS = ['📥','⚙️','✅','🚚','🔍','🧹','💧','✨','📦','🔧','⏳','🎉','❌','🔄','📋']
const COLOR_OPTIONS = [
  '#2563eb','#16a34a','#d97706','#ea580c','#dc2626',
  '#7c3aed','#0891b2','#db2777','#65a30d','#525252',
]

export default function StatusSettingsPage() {
  const [statuses, setStatuses] = useState<OrderStatusConfig[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add' | { type: 'edit'; s: OrderStatusConfig } | null>(null)
  const [dragIdx,  setDragIdx]  = useState<number | null>(null)
  const [overIdx,  setOverIdx]  = useState<number | null>(null)
  const [toast,    setToast]    = useState('')

  const [fKey,   setFKey]   = useState('')
  const [fLabel, setFLabel] = useState('')
  const [fDesc,  setFDesc]  = useState('')
  const [fColor, setFColor] = useState('#2563eb')
  const [fIcon,  setFIcon]  = useState('📦')
  const [fFinal, setFFinal] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const data = await fetchOrderStatuses()
    setStatuses(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 2500)
  }

  function openAdd() {
    setFKey(''); setFLabel(''); setFDesc(''); setFColor('#2563eb'); setFIcon('📦'); setFFinal(false)
    setModal('add')
  }
  function openEdit(s: OrderStatusConfig) {
    setFKey(s.key); setFLabel(s.label); setFDesc(s.description ?? '')
    setFColor(s.color); setFIcon(s.icon); setFFinal(s.is_final)
    setModal({ type: 'edit', s })
  }

  async function handleInit() {
    if (!confirm('Menambahkan 4 status default. Lanjutkan?')) return
    try { await initDefaultOrderStatuses(); await load(); showToast('Status default ditambahkan') }
    catch (e: any) { showToast('Gagal: ' + (e.message ?? '')) }
  }

  async function handleSave() {
    if (!fLabel.trim() || !fKey.trim()) return
    setSaving(true)
    try {
      const payload = {
        key: fKey.trim().toLowerCase().replace(/\s+/g, '_'),
        label: fLabel.trim(),
        description: fDesc.trim() || null as any,
        color: fColor, icon: fIcon,
        sort_order: modal === 'add' ? statuses.length : (modal as any).s.sort_order,
        is_final: fFinal,
      }
      if (modal === 'add') { await saveOrderStatus(payload); showToast('Status ditambahkan') }
      else if (modal && typeof modal === 'object') { await editOrderStatus(modal.s.id, payload); showToast('Status diperbarui') }
      setModal(null); await load()
    } catch (e: any) { showToast('Gagal: ' + (e.message ?? '')) }
    setSaving(false)
  }

  async function handleDelete(s: OrderStatusConfig) {
    if (!confirm('Hapus status "' + s.label + '"?')) return
    await removeOrderStatus(s.id); await load(); showToast('Status dihapus')
  }

  async function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setOverIdx(null); return }
    const arr = [...statuses]
    const [moved] = arr.splice(dragIdx, 1)
    arr.splice(toIdx, 0, moved)
    setStatuses(arr)
    setDragIdx(null); setOverIdx(null)
    await Promise.all(arr.map((s, i) => editOrderStatus(s.id, { sort_order: i })))
    showToast('Urutan disimpan')
  }

  const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8]"

  if (loading) return <PageSkeleton />

  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/owner/pengaturan" className="p-2 hover:bg-[#f5f4f1] rounded-xl border border-[#dddbd5] text-[#8a8a8a] transition-all">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Status Pesanan</h1>
              <p className="text-xs text-[#8a8a8a] mt-0.5">Custom tahapan proses — drag untuk ubah urutan</p>
            </div>
          </div>
          <div className="flex gap-2">
            {statuses.length === 0 && (
              <button onClick={handleInit} className="px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all">
                Pakai Default
              </button>
            )}
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
              <Plus size={14} /> Tambah Status
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">Status ini tampil di <strong>Kelola Pesanan</strong>, <strong>halaman Cek Status</strong> customer, dan <strong>notifikasi WhatsApp</strong>. Drag untuk ubah urutan timeline. Status <strong>Final</strong> menandakan pesanan tuntas.</p>
        </div>

        {!loading && statuses.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-semibold text-[#8a8a8a]">Belum ada status</p>
            <p className="text-xs text-[#c0bdb8] mt-1 mb-4">Mulai dengan 4 status bawaan atau buat sendiri</p>
            <button onClick={handleInit} className="px-5 py-2.5 bg-[#d4510c] text-white text-sm font-bold rounded-xl hover:bg-[#b84309] transition-all">
              Pakai Status Default
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">Memuat...</div>
        ) : (
          <div className="space-y-2">
            {statuses.map((s, idx) => (
              <div key={s.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => { e.preventDefault(); setOverIdx(idx) }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                className={`bg-white rounded-2xl border-[1.5px] shadow-sm transition-all select-none cursor-grab active:cursor-grabbing ${
                  overIdx === idx && dragIdx !== idx ? 'border-[#d4510c] bg-[#fdf9f7]' : 'border-[#dddbd5] hover:border-[#c0bdb8]'
                }`}>
                <div className="flex items-center gap-3 p-4">
                  <GripVertical size={16} className="text-[#c0bdb8] flex-shrink-0" />
                  <span className="text-xs font-extrabold text-[#c0bdb8] w-4 flex-shrink-0">{idx + 1}</span>
                  <div className="relative flex-shrink-0">
                    <span className="text-xl">{s.icon}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[#0d0d0d]">{s.label}</span>
                      <code className="text-[10px] bg-[#f5f4f1] text-[#8a8a8a] px-1.5 py-0.5 rounded-md font-mono">{s.key}</code>
                      {s.is_final && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={9} /> Final
                        </span>
                      )}
                    </div>
                    {s.description && <p className="text-[11px] text-[#8a8a8a] mt-0.5 truncate">{s.description}</p>}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 hidden sm:block"
                    style={{ backgroundColor: s.color + '18', color: s.color }}>
                    {s.label}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="p-2 hover:bg-[#f5f4f1] text-[#8a8a8a] hover:text-[#0d0d0d] rounded-lg transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-2 hover:bg-red-50 text-[#8a8a8a] hover:text-red-500 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {idx < statuses.length - 1 && <div className="text-center text-[#c0bdb8] text-xs pb-1.5 -mt-1">↓</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6] sticky top-0 bg-white z-10">
              <h3 className="font-extrabold text-[#0d0d0d]">{modal === 'add' ? 'Tambah Status Baru' : 'Edit Status'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg"><X size={16} className="text-[#8a8a8a]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Key (ID unik) *</label>
                <input value={fKey} onChange={e => setFKey(e.target.value.toLowerCase().replace(/\s+/g,'_'))}
                  placeholder="contoh: dicuci, disetrika, dikemas" className={inputCls}
                  disabled={modal !== 'add'} />
                <p className="text-[10px] text-[#8a8a8a] mt-1">Huruf kecil + underscore. Tidak bisa diubah setelah disimpan.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Tampil *</label>
                <input value={fLabel} onChange={e => setFLabel(e.target.value)} placeholder="Sedang Dicuci" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Deskripsi (untuk customer)</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Sepatu sedang dalam proses pencucian" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setFIcon(ic)}
                      className={`w-10 h-10 rounded-xl text-xl border-[1.5px] transition-all ${fIcon === ic ? 'border-[#d4510c] bg-[#fdf0ea]' : 'border-[#dddbd5] hover:bg-[#f5f4f1]'}`}>
                      {ic}
                    </button>
                  ))}
                  <input value={fIcon} onChange={e => setFIcon(e.target.value)} maxLength={2}
                    className="w-10 h-10 rounded-xl border-[1.5px] border-[#dddbd5] text-center text-xl outline-none focus:border-[#d4510c]" title="Custom emoji" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Warna</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} type="button" onClick={() => setFColor(c)}
                      className={`w-8 h-8 rounded-full border-[2.5px] transition-all ${fColor === c ? 'border-[#0d0d0d] scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={fColor} onChange={e => setFColor(e.target.value)}
                    className="w-8 h-8 rounded-full border border-[#dddbd5] cursor-pointer" />
                </div>
                {fLabel && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-[#8a8a8a]">Preview:</span>
                    <span className="text-sm">{fIcon}</span>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: fColor+'18', color: fColor }}>{fLabel}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3.5 bg-[#f5f4f1] rounded-xl border border-[#eceae6]">
                <div>
                  <p className="text-sm font-bold text-[#0d0d0d]">Status Final</p>
                  <p className="text-[11px] text-[#8a8a8a]">Pesanan dianggap tuntas pada status ini</p>
                </div>
                <button type="button" onClick={() => setFFinal(v => !v)}
                  className={`w-11 h-6 rounded-full border-2 transition-all relative ${fFinal ? 'bg-[#d4510c] border-[#d4510c]' : 'bg-[#dddbd5] border-[#dddbd5]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${fFinal ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">Batal</button>
              <button onClick={handleSave} disabled={saving || !fLabel.trim() || !fKey.trim()}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0d0d0d] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}