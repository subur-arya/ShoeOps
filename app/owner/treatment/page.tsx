'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { Toggle } from '@/components/ui/Toggle'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah } from '@/lib/utils'
import { fetchTreatments, createTreatment, editTreatment, removeTreatment } from '@/lib/api'
import type { Treatment } from '@/types'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all"

function AddForm({ newName, newPrice, setNewName, setNewPrice, onAdd, onCancel }: {
  newName: string; newPrice: string
  setNewName: (v: string) => void; setNewPrice: (v: string) => void
  onAdd: () => void; onCancel: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-extrabold text-[#0d0d0d]">Treatment Baru</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Treatment</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: Premium Restore" className={inputCls} autoFocus />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Harga (Rp)</label>
          <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="85000" className={inputCls} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-[#dddbd5] rounded-xl text-sm font-semibold text-[#525252] hover:bg-[#f5f4f1] transition-colors">Batal</button>
        <button onClick={onAdd} disabled={!newName || !newPrice} className="px-5 py-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">Simpan</button>
      </div>
    </div>
  )
}

function TreatmentRow({ t, editId, editName, editPrice, delConfirm, setEditName, setEditPrice, setEditId, setDelConfirm, onSaveEdit, onToggle, onDelete, onStartEdit }: {
  t: Treatment; editId: string | null; editName: string; editPrice: string; delConfirm: string | null
  setEditName: (v: string) => void; setEditPrice: (v: string) => void
  setEditId: (v: string | null) => void; setDelConfirm: (v: string | null) => void
  onSaveEdit: (id: string) => void; onToggle: (id: string, val: boolean) => void
  onDelete: (id: string) => void; onStartEdit: (t: Treatment) => void
}) {
  const isEditing  = editId === t.id
  const isDeleting = delConfirm === t.id
  return (
    <div className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${isDeleting ? 'bg-red-50' : 'hover:bg-[#fdf9f7]'}`}>
      {isEditing ? (
        <>
          <input value={editName} onChange={e => setEditName(e.target.value)} className={`${inputCls} flex-1`} autoFocus />
          <div className="relative flex-shrink-0 w-36">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8a8a8a] font-semibold">Rp</span>
            <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" className={`${inputCls} pl-8`} placeholder="Harga" />
          </div>
          <button onClick={() => onSaveEdit(t.id)} className="p-2 bg-[#d4510c] text-white rounded-lg hover:bg-[#b84309] transition-colors"><Check size={14} /></button>
          <button onClick={() => setEditId(null)} className="p-2 bg-[#f5f4f1] text-[#525252] rounded-lg hover:bg-[#eceae6] transition-colors"><X size={14} /></button>
        </>
      ) : isDeleting ? (
        <>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">Hapus "{t.name}"?</p>
            <p className="text-xs text-red-500 mt-0.5">Data tidak dapat dikembalikan</p>
          </div>
          <button onClick={() => onDelete(t.id)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">Hapus</button>
          <button onClick={() => setDelConfirm(null)} className="px-3 py-1.5 bg-white text-[#525252] text-xs font-bold rounded-lg border border-[#dddbd5] hover:bg-[#f5f4f1] transition-colors">Batal</button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${t.is_active ? 'text-[#0d0d0d]' : 'text-[#8a8a8a] line-through'}`}>{t.name}</p>
          </div>
          <span className="text-sm font-bold text-[#525252] flex-shrink-0">{formatRupiah(t.price)}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-[#f5f4f1] text-[#8a8a8a]'}`}>
            {t.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
          <Toggle value={t.is_active} onChange={v => onToggle(t.id, v)} />
          <button onClick={() => onStartEdit(t)} className="p-1.5 text-[#8a8a8a] hover:text-[#0d0d0d] hover:bg-[#f5f4f1] rounded-lg transition-colors"><Pencil size={13} /></button>
          <button onClick={() => setDelConfirm(t.id)} className="p-1.5 text-[#8a8a8a] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
        </>
      )}
    </div>
  )
}

export default function TreatmentPage() {
  const [treats,     setTreats]     = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [editPrice,  setEditPrice]  = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newPrice,   setNewPrice]   = useState('')
  const [delConfirm, setDelConfirm] = useState<string | null>(null)
  const { toast, show, hide } = useToast()

  useEffect(() => { fetchTreatments().then(t => { setTreats(t); setLoading(false) }) }, [])

  function startEdit(t: Treatment) {
    setEditId(t.id); setEditName(t.name); setEditPrice(String(t.price)); setShowAdd(false)
  }
  async function saveEdit(id: string) {
    if (!editName.trim()) return
    const updated = await editTreatment(id, { name: editName.trim(), price: parseInt(editPrice) || 0 })
    setTreats(updated); setEditId(null); show('Treatment diperbarui')
  }
  async function handleAdd() {
    if (!newName.trim() || !newPrice) return
    const updated = await createTreatment({ name: newName.trim(), price: parseInt(newPrice), is_active: true })
    setTreats(updated); setNewName(''); setNewPrice(''); setShowAdd(false); show('Treatment baru ditambahkan')
  }
  async function handleToggle(id: string, val: boolean) {
    const updated = await editTreatment(id, { is_active: val })
    setTreats(updated)
    show(val ? 'Treatment diaktifkan' : 'Treatment dinonaktifkan')
  }
  async function handleDelete(id: string) {
    const updated = await removeTreatment(id)
    setTreats(updated); setDelConfirm(null); show('Treatment dihapus')
  }

  const active   = treats.filter(t =>  t.is_active)
  const inactive = treats.filter(t => !t.is_active)

  const rowProps = {
    editId, editName, editPrice, delConfirm,
    setEditName, setEditPrice, setEditId, setDelConfirm,
    onSaveEdit: saveEdit, onToggle: handleToggle, onDelete: handleDelete, onStartEdit: startEdit,
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Treatment & Harga</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">{treats.length} treatment terdaftar · {active.length} aktif</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
          <Plus size={15} /> Tambah Treatment
        </button>
      </div>

      <div className="space-y-4">
        {showAdd && (
          <AddForm newName={newName} newPrice={newPrice} setNewName={setNewName} setNewPrice={setNewPrice}
            onAdd={handleAdd} onCancel={() => { setShowAdd(false); setNewName(''); setNewPrice('') }} />
        )}

        <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4]">
            <span className="text-xs font-bold text-[#0d0d0d]">Treatment Aktif</span>
            <span className="ml-2 text-xs text-[#8a8a8a]">({active.length})</span>
          </div>
          {active.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#8a8a8a]">Tidak ada treatment aktif.</p>
          ) : (
            <div className="divide-y divide-[#eceae6]">
              {active.map(t => <TreatmentRow key={t.id} t={t} {...rowProps} />)}
            </div>
          )}
        </div>

        {inactive.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4]">
              <span className="text-xs font-bold text-[#8a8a8a]">Treatment Nonaktif</span>
              <span className="ml-2 text-xs text-[#8a8a8a]">({inactive.length})</span>
            </div>
            <div className="divide-y divide-[#eceae6]">
              {inactive.map(t => <TreatmentRow key={t.id} t={t} {...rowProps} />)}
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}