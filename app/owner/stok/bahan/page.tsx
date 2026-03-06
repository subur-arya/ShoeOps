'use client'
import { useState, useEffect } from 'react'
import { fetchTreatments, fetchMaterials, fetchMaterialUsages, saveMaterialUsage, removeMaterialUsage } from '@/lib/api'
import type { Treatment, Material, MaterialUsage } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react'

export default function PengaturanBahanPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [materials,  setMaterials]  = useState<Material[]>([])
  const [usages,     setUsages]     = useState<MaterialUsage[]>([])
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  // Form add usage
  const [addingFor,  setAddingFor]  = useState<string | null>(null)
  const [fMatId,     setFMatId]     = useState('')
  const [fType,      setFType]      = useState<'qty' | 'pct'>('qty')
  const [fValue,     setFValue]     = useState('')
  const [saving,     setSaving]     = useState(false)

  async function load() {
    setLoading(true)
    const [ts, ms, us] = await Promise.all([fetchTreatments(), fetchMaterials(), fetchMaterialUsages()])
    setTreatments(ts.filter(t => t.is_active))
    setMaterials(ms)
    setUsages(us)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startAdd(treatId: string) {
    setAddingFor(treatId)
    setFMatId(materials[0]?.id ?? '')
    setFType('qty')
    setFValue('')
  }

  async function handleAdd(treatId: string) {
    if (!fMatId || !fValue) return
    setSaving(true)
    try {
      await saveMaterialUsage({ treatment_id: treatId, material_id: fMatId, deduct_type: fType, deduct_value: parseFloat(fValue) })
      setAddingFor(null)
      await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleRemove(id: string) {
    if (!confirm('Hapus pengaturan bahan ini?')) return
    await removeMaterialUsage(id)
    await load()
  }

  const selMat = materials.find(m => m.id === fMatId)

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Bahan per Treatment</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Atur bahan apa saja yang berkurang ketika treatment diproses</p>
        </div>

        {materials.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 font-semibold">
            Belum ada bahan baku. Tambahkan dulu di halaman <strong>Stok Bahan Baku</strong>.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#8a8a8a] text-sm">Memuat...</div>
        ) : treatments.length === 0 ? (
          <div className="text-center py-12 text-[#8a8a8a] text-sm">Belum ada treatment aktif.</div>
        ) : (
          <div className="space-y-3">
            {treatments.map(t => {
              const tUsages = usages.filter(u => u.treatment_id === t.id)
              const isOpen  = expanded === t.id

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-[#dddbd5] overflow-hidden">
                  {/* Header treatment */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fafaf9] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#fdf0ea] flex items-center justify-center flex-shrink-0">
                        <Package size={15} className="text-[#d4510c]" />
                      </div>
                      <div className="text-left">
                        <p className="font-extrabold text-[#0d0d0d] text-sm">{t.name}</p>
                        <p className="text-[11px] text-[#8a8a8a]">{formatRupiah(t.price)} · {tUsages.length} bahan dipakai</p>
                      </div>
                    </div>
                    {isOpen ? <ChevronDown size={15} className="text-[#8a8a8a]" /> : <ChevronRight size={15} className="text-[#8a8a8a]" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#eceae6]">
                      {/* List bahan yang dipakai */}
                      {tUsages.length === 0 ? (
                        <p className="text-xs text-[#8a8a8a] px-5 py-3">Belum ada bahan yang diatur untuk treatment ini.</p>
                      ) : (
                        <div className="divide-y divide-[#f5f4f1]">
                          {tUsages.map(u => {
                            const mat = materials.find(m => m.id === u.material_id) ?? u.material
                            return (
                              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#0d0d0d]">{mat?.name ?? '—'}</p>
                                  <p className="text-[11px] text-[#8a8a8a]">
                                    Berkurang: {u.deduct_type === 'qty'
                                      ? `${u.deduct_value} ${mat?.unit ?? ''}`
                                      : `${u.deduct_value}% dari stok saat ini`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${u.deduct_type === 'qty' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {u.deduct_type === 'qty' ? 'Jumlah' : 'Persentase'}
                                  </span>
                                  <button onClick={() => handleRemove(u.id)}
                                    className="p-1.5 hover:bg-red-50 text-[#c0bdb8] hover:text-red-500 rounded-lg transition-all">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Form tambah bahan */}
                      {addingFor === t.id ? (
                        <div className="px-5 py-4 bg-[#fafaf9] border-t border-[#eceae6] space-y-3">
                          <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Tambah Bahan</p>

                          {/* Pilih bahan */}
                          <div className="relative">
                            <select value={fMatId} onChange={e => setFMatId(e.target.value)}
                              className="w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] transition-all appearance-none cursor-pointer">
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name} (stok: {m.stock} {m.unit})</option>
                              ))}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
                          </div>

                          {/* Tipe pengurangan */}
                          <div className="grid grid-cols-2 gap-2">
                            {(['qty', 'pct'] as const).map(tp => (
                              <button key={tp} type="button" onClick={() => setFType(tp)}
                                className={`py-2.5 rounded-xl text-sm font-bold border-[1.5px] transition-all ${fType === tp ? 'bg-[#d4510c] text-white border-[#d4510c]' : 'bg-white text-[#525252] border-[#dddbd5]'}`}>
                                {tp === 'qty' ? '📦 Jumlah' : '🔢 Persentase'}
                              </button>
                            ))}
                          </div>

                          {/* Nilai */}
                          <div>
                            <div className="flex items-center gap-2">
                              <input
                                value={fValue}
                                onChange={e => setFValue(e.target.value)}
                                placeholder={fType === 'qty' ? `Jumlah (${selMat?.unit ?? 'unit'})` : 'Persentase (%)'}
                                inputMode="decimal"
                                className="flex-1 px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] transition-all"
                              />
                              <span className="text-sm font-bold text-[#8a8a8a] flex-shrink-0">
                                {fType === 'qty' ? selMat?.unit : '%'}
                              </span>
                            </div>
                            {fValue && fType === 'pct' && parseFloat(fValue) > 0 && selMat && (
                              <p className="text-[11px] text-[#8a8a8a] mt-1.5">
                                ≈ {Math.round((parseFloat(fValue) / 100) * selMat.stock * 100) / 100} {selMat.unit} dari stok saat ini ({selMat.stock} {selMat.unit})
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => setAddingFor(null)}
                              className="flex-1 py-2 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-white transition-all">
                              Batal
                            </button>
                            <button onClick={() => handleAdd(t.id)} disabled={saving || !fValue}
                              className="flex-1 py-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                              {saving ? 'Menyimpan...' : 'Tambah'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-3 border-t border-[#eceae6]">
                          <button onClick={() => startAdd(t.id)} disabled={materials.length === 0}
                            className="flex items-center gap-2 text-[#d4510c] hover:text-[#b84309] text-xs font-bold disabled:opacity-40 transition-all">
                            <Plus size={13} /> Tambah Bahan
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}