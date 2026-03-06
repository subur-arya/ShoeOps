'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  fetchEquipment, fetchTreatments, fetchEquipmentUsages,
  saveEquipmentUsage, removeEquipmentUsage,
  type Equipment, type EquipmentUsage,
} from '@/lib/api'
import type { Treatment } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Plus, X, ChevronLeft, Wrench, Package } from 'lucide-react'

const CONDITION_COLOR: Record<string, string> = {
  baru:         'bg-blue-50 text-blue-700',
  baik:         'bg-green-50 text-green-700',
  perlu_servis: 'bg-amber-50 text-amber-700',
  rusak:        'bg-red-50 text-red-700',
}
const CONDITION_LABEL: Record<string, string> = {
  baru: 'Baru', baik: 'Baik', perlu_servis: 'Perlu Servis', rusak: 'Rusak',
}

export default function AlatTreatmentPage() {
  const [equipment,  setEquipment]  = useState<Equipment[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [usages,     setUsages]     = useState<EquipmentUsage[]>([])
  const [loading,    setLoading]    = useState(true)

  // Panel tambah relasi
  const [addingFor,  setAddingFor]  = useState<string | null>(null) // treatment_id
  const [pickEquip,  setPickEquip]  = useState('')
  const [saving,     setSaving]     = useState(false)

  // View mode: per treatment atau per alat
  const [viewMode, setViewMode] = useState<'treatment' | 'alat'>('treatment')

  async function load() {
    setLoading(true)
    const [eq, tr, us] = await Promise.all([fetchEquipment(), fetchTreatments(), fetchEquipmentUsages()])
    setEquipment(eq); setTreatments(tr); setUsages(us)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(treatmentId: string) {
    if (!pickEquip) return
    setSaving(true)
    try {
      await saveEquipmentUsage({ equipment_id: pickEquip, treatment_id: treatmentId })
      setAddingFor(null); setPickEquip('')
      await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleRemove(usageId: string) {
    await removeEquipmentUsage(usageId)
    await load()
  }

  // Per treatment: treatment → list alat
  const byTreatment = treatments.map(t => {
    const tUsages = usages.filter(u => u.treatment_id === t.id)
    const eqs     = tUsages.map(u => ({ usage: u, eq: equipment.find(e => e.id === u.equipment_id) })).filter(x => x.eq)
    const unlinked = equipment.filter(e => !tUsages.some(u => u.equipment_id === e.id))
    return { treatment: t, eqs, unlinked, tUsages }
  })

  // Per alat: alat → list treatment
  const byEquipment = equipment.map(eq => {
    const eqUsages   = usages.filter(u => u.equipment_id === eq.id)
    const treats     = eqUsages.map(u => ({ usage: u, tr: treatments.find(t => t.id === u.treatment_id) })).filter(x => x.tr)
    const unlinked   = treatments.filter(t => !eqUsages.some(u => u.treatment_id === t.id))
    return { eq, treats, unlinked, eqUsages }
  })

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/owner/alat"
              className="p-2 hover:bg-[#f5f4f1] rounded-xl border border-[#dddbd5] text-[#8a8a8a] transition-all">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Alat per Treatment</h1>
              <p className="text-xs text-[#8a8a8a] mt-0.5">Atur alat apa saja yang dipakai setiap treatment</p>
            </div>
          </div>
        </div>

        {/* Toggle view */}
        <div className="flex bg-[#f5f4f1] rounded-xl p-1 gap-1 w-fit">
          <button onClick={() => setViewMode('treatment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'treatment' ? 'bg-white text-[#0d0d0d] shadow-sm' : 'text-[#8a8a8a] hover:text-[#525252]'}`}>
            <Package size={12} /> Per Treatment
          </button>
          <button onClick={() => setViewMode('alat')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'alat' ? 'bg-white text-[#0d0d0d] shadow-sm' : 'text-[#8a8a8a] hover:text-[#525252]'}`}>
            <Wrench size={12} /> Per Alat
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">Memuat...</div>
        ) : (

          /* ── VIEW: PER TREATMENT ── */
          viewMode === 'treatment' ? (
            <div className="space-y-3">
              {treatments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
                  <p className="text-sm text-[#8a8a8a]">Belum ada treatment. Tambah treatment terlebih dahulu.</p>
                </div>
              ) : byTreatment.map(({ treatment: t, eqs, unlinked, tUsages }) => (
                <div key={t.id} className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                  {/* Treatment header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-[#eceae6] bg-[#f8f7f4]">
                    <div>
                      <p className="text-sm font-extrabold text-[#0d0d0d]">{t.name}</p>
                      <p className="text-xs text-[#8a8a8a] mt-0.5">{formatRupiah(t.price)} · {eqs.length} alat terhubung</p>
                    </div>
                    {equipment.length > 0 && unlinked.length > 0 && (
                      <button onClick={() => { setAddingFor(addingFor === t.id ? null : t.id); setPickEquip('') }}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#d4510c] hover:bg-[#fdf0ea] px-3 py-1.5 rounded-xl transition-all">
                        <Plus size={12} /> Tambah Alat
                      </button>
                    )}
                  </div>

                  {/* Picker tambah alat */}
                  {addingFor === t.id && (
                    <div className="px-5 py-3 border-b border-[#eceae6] bg-[#fdf9f7] flex items-center gap-2">
                      <div className="relative flex-1">
                        <select value={pickEquip} onChange={e => setPickEquip(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 border-[1.5px] border-[#dddbd5] rounded-xl text-xs font-semibold bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] appearance-none cursor-pointer">
                          <option value="">Pilih alat...</option>
                          {unlinked.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.name}{eq.brand ? ` (${eq.brand})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => handleAdd(t.id)} disabled={!pickEquip || saving}
                        className="px-4 py-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0">
                        {saving ? '...' : 'Tambah'}
                      </button>
                      <button onClick={() => setAddingFor(null)}
                        className="p-2 hover:bg-[#f5f4f1] text-[#8a8a8a] rounded-xl transition-all flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* List alat */}
                  <div className="divide-y divide-[#eceae6]">
                    {eqs.length === 0 ? (
                      <div className="px-5 py-4 text-center text-xs text-[#c0bdb8]">
                        Belum ada alat — klik "Tambah Alat" untuk menghubungkan
                      </div>
                    ) : eqs.map(({ usage, eq }) => eq && (
                      <div key={usage.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafaf9] transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-[#f5f4f1] flex items-center justify-center text-sm flex-shrink-0">🔧</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0d0d0d]">{eq.name}</p>
                          {eq.brand && <p className="text-[11px] text-[#8a8a8a]">{eq.brand}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${CONDITION_COLOR[eq.condition]}`}>
                          {CONDITION_LABEL[eq.condition]}
                        </span>
                        <button onClick={() => handleRemove(usage.id)}
                          className="p-1.5 hover:bg-red-50 text-[#c0bdb8] hover:text-red-400 rounded-lg transition-all flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          ) : (

            /* ── VIEW: PER ALAT ── */
            <div className="space-y-3">
              {equipment.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
                  <Wrench size={32} className="text-[#c0bdb8] mx-auto mb-3" />
                  <p className="text-sm text-[#8a8a8a]">Belum ada alat terdaftar.</p>
                  <Link href="/owner/alat" className="text-xs text-[#d4510c] font-semibold hover:underline mt-1 block">
                    Tambah alat →
                  </Link>
                </div>
              ) : byEquipment.map(({ eq, treats, unlinked, eqUsages }) => (
                <div key={eq.id} className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                  {/* Alat header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-[#eceae6] bg-[#f8f7f4]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#f5f4f1] border border-[#eceae6] flex items-center justify-center text-base flex-shrink-0">🔧</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-[#0d0d0d]">{eq.name}</p>
                          {eq.brand && <span className="text-[11px] text-[#8a8a8a]">{eq.brand}</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CONDITION_COLOR[eq.condition]}`}>
                            {CONDITION_LABEL[eq.condition]}
                          </span>
                        </div>
                        <p className="text-xs text-[#8a8a8a] mt-0.5">{treats.length} treatment · Beli {formatRupiah(eq.purchase_price)}</p>
                      </div>
                    </div>
                    {treatments.length > 0 && unlinked.length > 0 && (
                      <button onClick={() => { setAddingFor(addingFor === `eq-${eq.id}` ? null : `eq-${eq.id}`); setPickEquip('') }}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#d4510c] hover:bg-[#fdf0ea] px-3 py-1.5 rounded-xl transition-all">
                        <Plus size={12} /> Tambah Treatment
                      </button>
                    )}
                  </div>

                  {/* Picker tambah treatment ke alat */}
                  {addingFor === `eq-${eq.id}` && (
                    <div className="px-5 py-3 border-b border-[#eceae6] bg-[#fdf9f7] flex items-center gap-2">
                      <div className="relative flex-1">
                        <select value={pickEquip} onChange={e => setPickEquip(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 border-[1.5px] border-[#dddbd5] rounded-xl text-xs font-semibold bg-white text-[#0d0d0d] outline-none focus:border-[#d4510c] appearance-none cursor-pointer">
                          <option value="">Pilih treatment...</option>
                          {unlinked.map(t => (
                            <option key={t.id} value={t.id}>{t.name} — {formatRupiah(t.price)}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={async () => {
                          if (!pickEquip || saving) return
                          setSaving(true)
                          try {
                            await saveEquipmentUsage({ equipment_id: eq.id, treatment_id: pickEquip })
                            setAddingFor(null); setPickEquip('')
                            await load()
                          } catch (e) { console.error(e) }
                          setSaving(false)
                        }}
                        disabled={!pickEquip || saving}
                        className="px-4 py-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0">
                        {saving ? '...' : 'Tambah'}
                      </button>
                      <button onClick={() => setAddingFor(null)}
                        className="p-2 hover:bg-[#f5f4f1] text-[#8a8a8a] rounded-xl transition-all flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* List treatment */}
                  <div className="divide-y divide-[#eceae6]">
                    {treats.length === 0 ? (
                      <div className="px-5 py-4 text-center text-xs text-[#c0bdb8]">
                        Belum dipakai di treatment manapun
                      </div>
                    ) : treats.map(({ usage, tr }) => tr && (
                      <div key={usage.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafaf9] transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-[#fdf0ea] flex items-center justify-center text-sm flex-shrink-0">✨</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0d0d0d]">{tr.name}</p>
                          <p className="text-[11px] text-[#8a8a8a]">{formatRupiah(tr.price)}</p>
                        </div>
                        <button onClick={() => handleRemove(usage.id)}
                          className="p-1.5 hover:bg-red-50 text-[#c0bdb8] hover:text-red-400 rounded-lg transition-all flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}