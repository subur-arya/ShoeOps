'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  fetchEquipment, saveEquipment, editEquipment, removeEquipment,
  fetchEquipmentLogs, saveEquipmentLog, removeEquipmentLog,
  fetchEquipmentUsages,
  type Equipment, type EquipmentLog, type EquipmentUsage,
} from '@/lib/api'
import { formatRupiah } from '@/lib/utils'
import {
  Plus, X, Edit2, Trash2, ChevronDown, ChevronUp,
  Wrench, AlertTriangle, CheckCircle, Clock, Package, Download
} from 'lucide-react'
import { format, differenceInMonths, addMonths, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const CONDITION_CONFIG = {
  baru:         { label: 'Baru',         color: 'bg-blue-50 text-blue-700',   icon: '🆕' },
  baik:         { label: 'Baik',         color: 'bg-green-50 text-green-700', icon: '✅' },
  perlu_servis: { label: 'Perlu Servis', color: 'bg-amber-50 text-amber-700', icon: '⚠️' },
  rusak:        { label: 'Rusak',        color: 'bg-red-50 text-red-700',     icon: '🔴' },
}

const LOG_TYPE_CONFIG = {
  pembelian:   { label: 'Pembelian',   color: 'bg-blue-50 text-blue-700'   },
  servis:      { label: 'Servis',      color: 'bg-amber-50 text-amber-700' },
  perbaikan:   { label: 'Perbaikan',   color: 'bg-orange-50 text-orange-700'},
  penggantian: { label: 'Penggantian', color: 'bg-purple-50 text-purple-700'},
  lainnya:     { label: 'Lainnya',     color: 'bg-gray-50 text-gray-600'   },
}

const today = new Date().toISOString().slice(0, 10)

type Modal =
  | { type: 'add' }
  | { type: 'edit'; eq: Equipment }
  | { type: 'log'; eq: Equipment }
  | null

export default function AlatPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [logs,      setLogs]      = useState<EquipmentLog[]>([])
  const [usages,    setUsages]    = useState<EquipmentUsage[]>([])
  const [modal,     setModal]     = useState<Modal>(null)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  // Form equipment
  const [fName,      setFName]      = useState('')
  const [fBrand,     setFBrand]     = useState('')
  const [fCondition, setFCondition] = useState<Equipment['condition']>('baik')
  const [fPurchDate, setFPurchDate] = useState('')
  const [fPurchPrice,setFPurchPrice]= useState('')
  const [fLifetime,  setFLifetime]  = useState('24')
  const [fNotes,     setFNotes]     = useState('')
  const [saving,     setSaving]     = useState(false)

  // Form log
  const [lType,   setLType]   = useState<EquipmentLog['type']>('servis')
  const [lAmt,    setLAmt]    = useState('')
  const [lDate,   setLDate]   = useState(today)
  const [lNotes,  setLNotes]  = useState('')
  const [lSaving, setLSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [eq, lg, us] = await Promise.all([fetchEquipment(), fetchEquipmentLogs(), fetchEquipmentUsages()])
    setEquipment(eq); setLogs(lg); setUsages(us)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setFName(''); setFBrand(''); setFCondition('baik'); setFPurchDate(''); setFPurchPrice(''); setFLifetime('24'); setFNotes('')
    setModal({ type: 'add' })
  }
  function openEdit(eq: Equipment) {
    setFName(eq.name); setFBrand(eq.brand ?? ''); setFCondition(eq.condition)
    setFPurchDate(eq.purchase_date ?? ''); setFPurchPrice(eq.purchase_price ? String(eq.purchase_price) : '')
    setFLifetime(String(eq.estimated_lifetime_months)); setFNotes(eq.notes ?? '')
    setModal({ type: 'edit', eq })
  }
  function openLog(eq: Equipment) {
    setLType('servis'); setLAmt(''); setLDate(today); setLNotes('')
    setModal({ type: 'log', eq })
  }

  async function handleSaveEquipment() {
    if (!fName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: fName.trim(), brand: fBrand.trim(), condition: fCondition,
        purchase_date: fPurchDate || null as any,
        purchase_price: parseFloat(fPurchPrice.replace(/\D/g,'')) || 0,
        estimated_lifetime_months: parseInt(fLifetime) || 12,
        notes: fNotes.trim(),
      }
      if (modal?.type === 'add') await saveEquipment(payload)
      else if (modal?.type === 'edit') await editEquipment(modal.eq.id, payload)
      setModal(null); await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleSaveLog() {
    if (!lAmt || modal?.type !== 'log') return
    setLSaving(true)
    try {
      await saveEquipmentLog({
        equipment_id: modal.eq.id,
        type: lType,
        amount: parseFloat(lAmt.replace(/\D/g,'')) || 0,
        date: lDate,
        notes: lNotes.trim(),
      })
      setModal(null); await load()
    } catch (e) { console.error(e) }
    setLSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus alat ini? Semua log biaya ikut terhapus.')) return
    await removeEquipment(id); await load()
  }

  async function handleDeleteLog(id: string) {
    if (!confirm('Hapus log ini?')) return
    await removeEquipmentLog(id); await load()
  }

  // Computed per alat
  function getEquipmentStats(eq: Equipment) {
    const eqLogs    = logs.filter(l => l.equipment_id === eq.id)
    const totalCost = eqLogs.reduce((s, l) => s + l.amount, 0) + (eq.purchase_price || 0)
    const useCount  = usages.filter(u => u.equipment_id === eq.id).length
    const eqUsages  = usages.filter(u => u.equipment_id === eq.id)

    // Estimasi akhir umur
    let endDate: Date | null = null
    let ageMonths = 0
    let remainMonths: number | null = null
    if (eq.purchase_date) {
      const start = parseISO(eq.purchase_date)
      endDate     = addMonths(start, eq.estimated_lifetime_months)
      ageMonths   = differenceInMonths(new Date(), start)
      remainMonths = Math.max(0, eq.estimated_lifetime_months - ageMonths)
    }

    // Biaya per bulan
    const costPerMonth = ageMonths > 0 ? Math.round(totalCost / ageMonths) : 0

    return { eqLogs, totalCost, useCount, eqUsages, endDate, ageMonths, remainMonths, costPerMonth }
  }

  // Summary stats
  const totalEquipment    = equipment.length
  const needService       = equipment.filter(e => e.condition === 'perlu_servis' || e.condition === 'rusak').length
  const totalInvestment   = equipment.reduce((s, e) => s + (e.purchase_price || 0), 0)
  const totalMaintenanceCost = logs.reduce((s, l) => s + l.amount, 0)

  function exportCSV() {
    const rows = equipment.map(eq => {
      const stats = getEquipmentStats(eq)
      return [
        eq.name, eq.brand ?? '', CONDITION_CONFIG[eq.condition].label,
        eq.purchase_date ?? '', formatRupiah(eq.purchase_price),
        `${eq.estimated_lifetime_months} bln`, formatRupiah(stats.totalCost),
        stats.useCount, stats.remainMonths !== null ? `${stats.remainMonths} bln` : '-'
      ]
    })
    const headers = ['Nama','Merek','Kondisi','Tgl Beli','Harga Beli','Est. Umur','Total Biaya','Dipakai Treatment','Sisa Umur']
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=`alat-${today}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8]"

  if (loading) return <PageSkeleton />

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Manajemen Alat</h1>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Kelola peralatan, biaya perawatan & umur operasional</p>
          </div>
          <div className="flex gap-2">
            <Link href="/owner/alat/treatment"
              className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all">
              <Package size={14} /> Alat per Treatment
            </Link>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all">
              <Download size={14} /> Export
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
              <Plus size={14} /> Tambah Alat
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: 'Total Alat',       v: String(totalEquipment),        sub: 'unit terdaftar',   icon: Wrench,       color: 'text-[#d4510c]', bg: 'bg-[#fdf0ea]' },
            { l: 'Perlu Perhatian',  v: String(needService),           sub: 'servis / rusak',   icon: AlertTriangle,color: 'text-amber-600', bg: 'bg-amber-50'   },
            { l: 'Total Investasi',  v: formatRupiah(totalInvestment), sub: 'harga beli alat',  icon: Package,      color: 'text-blue-600',  bg: 'bg-blue-50'    },
            { l: 'Biaya Perawatan',  v: formatRupiah(totalMaintenanceCost), sub: 'servis+perbaikan', icon: Wrench, color: 'text-purple-600',bg: 'bg-purple-50'  },
          ].map(k => (
            <div key={k.l} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon size={15} className={k.color} />
              </div>
              <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{k.l}</div>
              <div className="text-xl font-extrabold text-[#0d0d0d] mt-1">{k.v}</div>
              <div className="text-xs text-[#8a8a8a] mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Alert kondisi buruk */}
        {needService > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700">{needService} alat perlu perhatian</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {equipment.filter(e => e.condition === 'rusak').map(e => e.name).join(', ') || ''}
                {equipment.filter(e => e.condition === 'perlu_servis').map(e => e.name).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* List alat */}
        {loading ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">Memuat...</div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
            <Wrench size={32} className="text-[#c0bdb8] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#8a8a8a]">Belum ada alat terdaftar</p>
            <p className="text-xs text-[#c0bdb8] mt-1">Klik "Tambah Alat" untuk mulai</p>
          </div>
        ) : (
          <div className="space-y-3">
            {equipment.map(eq => {
              const stats = getEquipmentStats(eq)
              const cond  = CONDITION_CONFIG[eq.condition]
              const isExpanded = expanded === eq.id
              const lifeUsedPct = eq.purchase_date
                ? Math.min(Math.round((stats.ageMonths / eq.estimated_lifetime_months) * 100), 100)
                : null
              const barColor = lifeUsedPct === null ? 'bg-gray-300'
                : lifeUsedPct >= 90 ? 'bg-red-400'
                : lifeUsedPct >= 70 ? 'bg-amber-400'
                : 'bg-green-400'

              return (
                <div key={eq.id} className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
                  {/* Header alat */}
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f4f1] border border-[#eceae6] flex items-center justify-center flex-shrink-0 text-lg">
                      🔧
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-[#0d0d0d]">{eq.name}</span>
                        {eq.brand && <span className="text-[11px] text-[#8a8a8a] font-medium">{eq.brand}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cond.color}`}>
                          {cond.icon} {cond.label}
                        </span>
                      </div>

                      {/* Progress umur */}
                      {lifeUsedPct !== null && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-[#8a8a8a]">
                              Umur: {stats.ageMonths} / {eq.estimated_lifetime_months} bln
                            </span>
                            <span className={`text-[10px] font-bold ${stats.remainMonths === 0 ? 'text-red-500' : stats.remainMonths! <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                              {stats.remainMonths! > 0 ? `Sisa ${stats.remainMonths} bln` : 'Melewati estimasi'}
                            </span>
                          </div>
                          <div className="w-full bg-[#eceae6] rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${lifeUsedPct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-[11px] text-[#8a8a8a]">
                          Beli: <span className="font-semibold text-[#525252]">{formatRupiah(eq.purchase_price)}</span>
                        </span>
                        <span className="text-[11px] text-[#8a8a8a]">
                          Total biaya: <span className="font-semibold text-[#d4510c]">{formatRupiah(stats.totalCost)}</span>
                        </span>
                        {stats.costPerMonth > 0 && (
                          <span className="text-[11px] text-[#8a8a8a]">
                            ~<span className="font-semibold text-[#525252]">{formatRupiah(stats.costPerMonth)}</span>/bln
                          </span>
                        )}
                        <span className="text-[11px] text-[#8a8a8a]">
                          Dipakai: <span className="font-semibold text-[#525252]">{stats.useCount} treatment</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openLog(eq)}
                        className="p-2 hover:bg-amber-50 text-[#8a8a8a] hover:text-amber-600 rounded-lg transition-all" title="Catat biaya">
                        <Wrench size={14} />
                      </button>
                      <button onClick={() => openEdit(eq)}
                        className="p-2 hover:bg-[#f5f4f1] text-[#8a8a8a] hover:text-[#0d0d0d] rounded-lg transition-all">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(eq.id)}
                        className="p-2 hover:bg-red-50 text-[#8a8a8a] hover:text-red-500 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : eq.id)}
                        className="p-2 hover:bg-[#f5f4f1] text-[#8a8a8a] rounded-lg transition-all">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: log + treatment */}
                  {isExpanded && (
                    <div className="border-t border-[#eceae6] px-4 py-4 space-y-4 bg-[#fafaf9]">

                      {/* Treatment yang pakai alat ini */}
                      <div>
                        <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Dipakai pada Treatment</p>
                        {stats.eqUsages.length === 0 ? (
                          <p className="text-xs text-[#c0bdb8]">Belum diset ke treatment manapun.
                            <Link href="/owner/alat/treatment" className="ml-1 text-[#d4510c] font-semibold hover:underline">Set sekarang →</Link>
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {stats.eqUsages.map(u => (
                              <span key={u.id} className="text-[11px] font-semibold px-2.5 py-1 bg-[#fdf0ea] text-[#d4510c] border border-[#f0c9b0] rounded-full">
                                {(u.treatment as any)?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Catatan alat */}
                      {eq.notes && (
                        <div>
                          <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1">Catatan</p>
                          <p className="text-xs text-[#525252]">{eq.notes}</p>
                        </div>
                      )}

                      {/* Log biaya */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">Riwayat Biaya</p>
                          <button onClick={() => openLog(eq)}
                            className="text-[11px] font-bold text-[#d4510c] hover:underline flex items-center gap-1">
                            <Plus size={11} /> Catat Biaya
                          </button>
                        </div>
                        {stats.eqLogs.length === 0 ? (
                          <p className="text-xs text-[#c0bdb8]">Belum ada riwayat biaya.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {stats.eqLogs.map(l => (
                              <div key={l.id} className="flex items-center gap-3 py-1.5 border-b border-[#eceae6] last:border-0">
                                <span className="text-[10px] text-[#8a8a8a] w-20 flex-shrink-0">
                                  {new Date(l.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'2-digit' })}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${LOG_TYPE_CONFIG[l.type].color}`}>
                                  {LOG_TYPE_CONFIG[l.type].label}
                                </span>
                                <span className="flex-1 text-xs text-[#525252] truncate">{l.notes || '—'}</span>
                                <span className="text-xs font-bold text-[#0d0d0d] flex-shrink-0">{formatRupiah(l.amount)}</span>
                                <button onClick={() => handleDeleteLog(l.id)}
                                  className="p-1 hover:bg-red-50 text-[#c0bdb8] hover:text-red-400 rounded-lg transition-all flex-shrink-0">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                            <div className="flex justify-between pt-1.5 text-xs font-extrabold text-[#0d0d0d]">
                              <span>Total biaya (excl. pembelian)</span>
                              <span className="text-[#d4510c]">
                                {formatRupiah(stats.eqLogs.reduce((s, l) => s + l.amount, 0))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL TAMBAH/EDIT ALAT ── */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6] sticky top-0 bg-white">
              <h3 className="font-extrabold text-[#0d0d0d]">
                {modal.type === 'add' ? 'Tambah Alat Baru' : 'Edit Alat'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg">
                <X size={16} className="text-[#8a8a8a]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Alat *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Mesin cuci, sikat, dll" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Merek</label>
                  <input value={fBrand} onChange={e => setFBrand(e.target.value)} placeholder="Bosch, Makita, dll" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Kondisi</label>
                  <div className="relative">
                    <select value={fCondition} onChange={e => setFCondition(e.target.value as any)} className={`${inputCls} appearance-none cursor-pointer`}>
                      {Object.entries(CONDITION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Tanggal Beli</label>
                  <input type="date" value={fPurchDate} onChange={e => setFPurchDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Harga Beli (Rp)</label>
                  <input value={fPurchPrice} onChange={e => setFPurchPrice(e.target.value)} placeholder="0" inputMode="numeric" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                    Estimasi Umur Pakai (bulan)
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="120" value={fLifetime} onChange={e => setFLifetime(e.target.value)}
                      className="flex-1 accent-[#d4510c]" />
                    <span className="text-sm font-extrabold text-[#d4510c] w-16 text-right">{fLifetime} bln</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#c0bdb8] mt-0.5">
                    <span>1 bln</span><span>5 thn</span><span>10 thn</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Catatan</label>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2}
                    placeholder="Spesifikasi, lokasi penyimpanan, dll" className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">Batal</button>
              <button onClick={handleSaveEquipment} disabled={saving || !fName.trim()}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CATAT BIAYA ── */}
      {modal?.type === 'log' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6]">
              <div>
                <h3 className="font-extrabold text-[#0d0d0d]">Catat Biaya</h3>
                <p className="text-xs text-[#8a8a8a] mt-0.5">{modal.eq.name}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg">
                <X size={16} className="text-[#8a8a8a]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Jenis</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(LOG_TYPE_CONFIG) as [EquipmentLog['type'], any][])
                    .filter(([k]) => k !== 'pembelian')
                    .map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setLType(k)}
                      className={`py-2 rounded-xl text-[11px] font-bold border-[1.5px] transition-all ${lType === k ? 'border-[#d4510c] bg-[#fdf0ea] text-[#d4510c]' : 'border-[#dddbd5] text-[#525252] hover:bg-[#f5f4f1]'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Jumlah (Rp) *</label>
                  <input value={lAmt} onChange={e => setLAmt(e.target.value)} placeholder="0" inputMode="numeric" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Tanggal</label>
                  <input type="date" value={lDate} onChange={e => setLDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Keterangan</label>
                <input value={lNotes} onChange={e => setLNotes(e.target.value)} placeholder="Ganti oli, beli sparepart, dll" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">Batal</button>
              <button onClick={handleSaveLog} disabled={lSaving || !lAmt}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                {lSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}