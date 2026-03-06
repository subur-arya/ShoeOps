'use client'
import { useState } from 'react'
import type { Treatment, Customer } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface FormValues {
  customerName: string
  customerPhone: string
  treatmentId: string
  estimatedDoneAt: string
  notes: string
}

interface Props {
  treatments: Treatment[]
  customers: Customer[]
  onSubmit: (values: FormValues) => Promise<void>
  onSuccess?: () => void
}

export function OrderForm({ treatments, customers, onSubmit, onSuccess }: Props) {
  const [values, setValues] = useState<FormValues>({
    customerName: '', customerPhone: '', treatmentId: '', estimatedDoneAt: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Partial<FormValues>>({})

  const selectedTreatment = treatments.find(t => t.id === values.treatmentId)
  const set = (k: keyof FormValues, v: string) => {
    setValues(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  // Customer name autocomplete
  const suggestions = values.customerName.length > 1
    ? customers.filter(c => c.name.toLowerCase().includes(values.customerName.toLowerCase())).slice(0, 5)
    : []

  function validate(): boolean {
    const e: Partial<FormValues> = {}
    if (!values.customerName.trim()) e.customerName = 'Nama wajib diisi'
    if (!values.treatmentId) e.treatmentId = 'Pilih treatment'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      await onSubmit(values)
      setSaved(true)
      setValues({ customerName: '', customerPhone: '', treatmentId: '', estimatedDoneAt: '', notes: '' })
      setTimeout(() => { setSaved(false); onSuccess?.() }, 3000)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white border border-[#dddbd5] rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-extrabold text-[#0d0d0d] tracking-tight mb-4">Input Pesanan Baru</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Customer name with autocomplete */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
            Nama Customer <span className="text-red-500">*</span>
          </label>
          <input
            value={values.customerName}
            onChange={e => set('customerName', e.target.value)}
            placeholder="Nama lengkap"
            className={`w-full px-3 py-2.5 border-[1.5px] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none placeholder:text-[#c0bdb8] transition-all
              ${errors.customerName ? 'border-red-400 focus:border-red-500' : 'border-[#dddbd5] focus:border-[#d4510c]'} focus:bg-white`}
          />
          {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-[#dddbd5] rounded-xl shadow-md z-20 overflow-hidden mt-1">
              {suggestions.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { set('customerName', c.name); if (c.phone) set('customerPhone', c.phone) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#f5f4f1] transition-colors">
                  <span className="font-semibold text-[#0d0d0d]">{c.name}</span>
                  {c.phone && <span className="text-xs text-[#8a8a8a] ml-2">{c.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">No. Telepon</label>
          <input
            value={values.customerPhone} onChange={e => set('customerPhone', e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="w-full px-3 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none placeholder:text-[#c0bdb8] focus:border-[#d4510c] focus:bg-white transition-all"
          />
        </div>

        {/* Treatment */}
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
            Treatment <span className="text-red-500">*</span>
          </label>
          <select
            value={values.treatmentId} onChange={e => set('treatmentId', e.target.value)}
            className={`w-full px-3 py-2.5 border-[1.5px] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none transition-all cursor-pointer
              ${errors.treatmentId ? 'border-red-400' : 'border-[#dddbd5] focus:border-[#d4510c]'} focus:bg-white`}
          >
            <option value="">Pilih treatment</option>
            {treatments.filter(t => t.is_active).map(t => (
              <option key={t.id} value={t.id}>{t.name} — {formatRupiah(t.price)}</option>
            ))}
          </select>
          {errors.treatmentId && <p className="text-xs text-red-500 mt-1">{errors.treatmentId}</p>}
        </div>

        {/* Estimated done */}
        <div>
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Estimasi Selesai</label>
          <input
            type="date" value={values.estimatedDoneAt} onChange={e => set('estimatedDoneAt', e.target.value)}
            className="w-full px-3 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all cursor-pointer"
          />
        </div>

        {/* Notes - full width */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Catatan (opsional)</label>
          <input
            value={values.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Kondisi sepatu, permintaan khusus..."
            className="w-full px-3 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none placeholder:text-[#c0bdb8] focus:border-[#d4510c] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#8a8a8a]">Total:</span>
          <span className="text-xl font-extrabold text-[#d4510c] tracking-tight">
            {selectedTreatment ? formatRupiah(selectedTreatment.price) : '—'}
          </span>
        </div>
        <div className="flex gap-2">
          {saved ? (
            <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
              ✓ Pesanan tersimpan
            </div>
          ) : (
            <>
              <button
                onClick={() => setValues({ customerName: '', customerPhone: '', treatmentId: '', estimatedDoneAt: '', notes: '' })}
                className="px-4 py-2.5 bg-[#f5f4f1] hover:bg-[#eceae6] border border-[#dddbd5] rounded-xl text-sm font-semibold text-[#525252] transition-all">
                Reset
              </button>
              <button
                onClick={handleSubmit} disabled={loading}
                className="px-6 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Simpan Pesanan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
