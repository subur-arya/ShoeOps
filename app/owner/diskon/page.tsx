'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDate } from '@/lib/utils'
import { fetchDiscounts, saveDiscount, editDiscount, removeDiscount } from '@/lib/api'
import type { Discount } from '@/lib/store'
import { Plus, Pencil, Trash2, Tag, CheckCircle, XCircle, Clock } from 'lucide-react'

const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8] placeholder:font-normal"

type FormState = { code: string; type: 'pct'|'flat'; value: string; minOrder: string; maxUses: string; expiresAt: string; active: boolean }
const EMPTY: FormState = { code: '', type: 'pct', value: '', minOrder: '', maxUses: '', expiresAt: '', active: true }

function PromoForm({ form, setF, onSave, onCancel, isEdit }: {
  form: FormState
  setF: (k: string, v: any) => void
  onSave: () => void
  onCancel: () => void
  isEdit?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-extrabold text-[#0d0d0d]">{isEdit ? 'Edit Promo' : 'Tambah Promo Baru'}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Kode Promo *</label>
          <input value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())}
            placeholder="HEMAT10" className={`${inputCls} font-mono tracking-widest`} autoFocus />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Tipe Diskon</label>
          <select value={form.type} onChange={e => setF('type', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="pct">Persentase (%)</option>
            <option value="flat">Nominal (Rp)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
            Nilai {form.type === 'pct' ? '(%)' : '(Rp)'} *
          </label>
          <input value={form.value} onChange={e => setF('value', e.target.value)} type="number"
            placeholder={form.type === 'pct' ? '10' : '5000'} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Min. Pesanan (Rp)</label>
          <input value={form.minOrder} onChange={e => setF('minOrder', e.target.value)} type="number"
            placeholder="0 = tidak ada minimum" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Maks. Penggunaan</label>
          <input value={form.maxUses} onChange={e => setF('maxUses', e.target.value)} type="number"
            placeholder="Kosongkan = tidak terbatas" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Berlaku Hingga</label>
          <input value={form.expiresAt} onChange={e => setF('expiresAt', e.target.value)} type="date"
            min={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-[#dddbd5] rounded-xl text-sm font-semibold text-[#525252] hover:bg-[#f5f4f1] transition-colors">Batal</button>
        <button type="button" onClick={onSave} disabled={!form.code || !form.value}
          className="px-5 py-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all">
          {isEdit ? 'Simpan Perubahan' : 'Tambah Promo'}
        </button>
      </div>
    </div>
  )
}

function DiscountCard({ d, editId, form, setF, onStartEdit, onUpdate, onCancelEdit, onToggle, onDelete, delId, setDelId }: {
  d: Discount; editId: string | null; form: FormState
  setF: (k: string, v: any) => void
  onStartEdit: (d: Discount) => void
  onUpdate: (id: string) => void
  onCancelEdit: () => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  delId: string | null
  setDelId: (id: string | null) => void
}) {
  const expired   = d.expiresAt ? new Date(d.expiresAt) < new Date() : false
  const quotaFull = d.maxUses !== null && d.usedCount >= d.maxUses
  const statusOk  = d.active && !expired && !quotaFull

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${statusOk ? 'border-[#dddbd5]' : 'border-[#eceae6] opacity-70'}`}>
      {editId === d.id ? (
        <PromoForm form={form} setF={setF} isEdit onSave={() => onUpdate(d.id)} onCancel={onCancelEdit} />
      ) : delId === d.id ? (
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-bold text-red-700">Hapus promo <span className="font-mono">{d.code}</span>?</p>
            <p className="text-xs text-red-500 mt-0.5">Aksi tidak dapat dibatalkan</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => onDelete(d.id)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl">Hapus</button>
            <button onClick={() => setDelId(null)} className="px-3 py-1.5 border border-[#dddbd5] text-xs font-semibold rounded-xl hover:bg-[#f5f4f1] transition-colors">Batal</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#fdf0ea] rounded-xl flex items-center justify-center flex-shrink-0">
              <Tag size={18} className="text-[#d4510c]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-extrabold text-[#0d0d0d] tracking-wider">{d.code}</span>
                {statusOk
                  ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle size={9}/>Aktif</span>
                  : expired
                  ? <span className="flex items-center gap-1 text-[10px] font-bold text-[#8a8a8a] bg-[#f5f4f1] px-2 py-0.5 rounded-full"><Clock size={9}/>Kadaluarsa</span>
                  : quotaFull
                  ? <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><XCircle size={9}/>Kuota Habis</span>
                  : <span className="flex items-center gap-1 text-[10px] font-bold text-[#8a8a8a] bg-[#f5f4f1] px-2 py-0.5 rounded-full">Nonaktif</span>
                }
              </div>
              <p className="text-xl font-extrabold text-[#d4510c] mt-1 tracking-tight">
                {d.type === 'pct' ? `${d.value}% off` : `Hemat ${formatRupiah(d.value)}`}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onStartEdit(d)}
                className="p-2 text-[#8a8a8a] hover:text-[#0d0d0d] hover:bg-[#f5f4f1] rounded-lg transition-all"><Pencil size={13}/></button>
              <button onClick={() => setDelId(d.id)}
                className="p-2 text-[#8a8a8a] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13}/></button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6]">
              <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">Min. Pesanan</p>
              <p className="text-sm font-bold text-[#0d0d0d] mt-0.5">{d.minOrder > 0 ? formatRupiah(d.minOrder) : 'Tidak ada'}</p>
            </div>
            <div className="bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6]">
              <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">Penggunaan</p>
              <p className="text-sm font-bold text-[#0d0d0d] mt-0.5">
                {d.usedCount}x {d.maxUses !== null ? `/ ${d.maxUses}` : <span className="text-[#8a8a8a]">∞</span>}
              </p>
              {d.maxUses !== null && (
                <div className="mt-1.5 h-1 bg-[#dddbd5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#d4510c] rounded-full" style={{ width: `${Math.min(100, d.usedCount / d.maxUses * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="bg-[#f5f4f1] rounded-xl p-3 border border-[#eceae6]">
              <p className="text-[9px] font-bold text-[#8a8a8a] uppercase tracking-widest">Berlaku Hingga</p>
              <p className="text-sm font-bold text-[#0d0d0d] mt-0.5">{d.expiresAt ? formatDate(d.expiresAt) : 'Tidak terbatas'}</p>
            </div>
          </div>

          {!expired && !quotaFull && (
            <div className="mt-3 pt-3 border-t border-[#eceae6] flex items-center justify-between">
              <span className="text-xs text-[#8a8a8a]">Status promo</span>
              <button onClick={() => onToggle(d.id, !d.active)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  d.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-[#f5f4f1] text-[#8a8a8a] hover:bg-[#eceae6]'
                }`}>
                {d.active ? '✓ Aktif — klik untuk nonaktifkan' : '○ Nonaktif — klik untuk aktifkan'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DiskonPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [delId,     setDelId]     = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(EMPTY)
  const { toast, show, hide } = useToast()

  function setF(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => { fetchDiscounts().then(d => { setDiscounts(d); setLoading(false) }) }, [])

  async function handleAdd() {
    if (!form.code.trim() || !form.value) return
    const updated = await saveDiscount({
      code: form.code.trim().toUpperCase(), type: form.type,
      value: parseFloat(form.value), minOrder: parseFloat(form.minOrder) || 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null, active: true,
    })
    setDiscounts(updated); setShowAdd(false); setForm(EMPTY); show('Promo berhasil ditambahkan')
  }

  async function handleUpdate(id: string) {
    const updated = await editDiscount(id, {
      code: form.code.trim().toUpperCase(), type: form.type,
      value: parseFloat(form.value), minOrder: parseFloat(form.minOrder) || 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    })
    setDiscounts(updated); setEditId(null); setForm(EMPTY); show('Promo diperbarui')
  }

  function startEdit(d: Discount) {
    setEditId(d.id); setShowAdd(false)
    setForm({ code: d.code, type: d.type, value: String(d.value), minOrder: String(d.minOrder),
      maxUses: d.maxUses ? String(d.maxUses) : '', expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : '', active: d.active })
  }

  async function handleToggle(id: string, active: boolean) {
    const updated = await editDiscount(id, { active })
    setDiscounts(updated)
    show(active ? 'Promo diaktifkan' : 'Promo dinonaktifkan')
  }

  async function handleDelete(id: string) {
    const updated = await removeDiscount(id)
    setDiscounts(updated); setDelId(null); show('Promo dihapus')
  }

  const isExpired   = (d: Discount) => d.expiresAt ? new Date(d.expiresAt) < new Date() : false
  const isQuotaFull = (d: Discount) => d.maxUses !== null && d.usedCount >= d.maxUses

  const active   = discounts.filter(d => d.active && !isExpired(d) && !isQuotaFull(d))
  const inactive = discounts.filter(d => !d.active || isExpired(d) || isQuotaFull(d))

  const cardProps = { editId, form, setF, onStartEdit: startEdit, onUpdate: handleUpdate,
    onCancelEdit: () => { setEditId(null); setForm(EMPTY) }, onToggle: handleToggle, onDelete: handleDelete, delId, setDelId }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Diskon & Promo</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">{active.length} promo aktif · {discounts.reduce((s,d) => s+d.usedCount, 0)} total digunakan</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm(EMPTY) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
          <Plus size={15} /> Buat Promo
        </button>
      </div>

      <div className="space-y-4">
        {showAdd && (
          <PromoForm form={form} setF={setF} onSave={handleAdd} onCancel={() => { setShowAdd(false); setForm(EMPTY) }} />
        )}

        {active.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#8a8a8a] uppercase tracking-widest">Aktif & Berlaku</h2>
            {active.map(d => <DiscountCard key={d.id} d={d} {...cardProps} />)}
          </div>
        )}

        {inactive.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#8a8a8a] uppercase tracking-widest">Nonaktif / Kadaluarsa</h2>
            {inactive.map(d => <DiscountCard key={d.id} d={d} {...cardProps} />)}
          </div>
        )}

        {discounts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-[#fdf0ea] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag size={24} className="text-[#d4510c]" />
            </div>
            <p className="text-base font-extrabold text-[#0d0d0d]">Belum ada promo</p>
            <p className="text-sm text-[#8a8a8a] mt-1">Buat promo pertama untuk menarik lebih banyak customer</p>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}