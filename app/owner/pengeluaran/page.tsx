'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import {
  fetchExpenses, fetchExpenseCategories,
  saveExpense, editExpense, removeExpense,
  saveExpenseCategory, removeExpenseCategory,
  type Expense, type ExpenseCategory
} from '@/lib/api'
import { formatRupiah } from '@/lib/utils'
import { Plus, Trash2, Edit2, X, Tag, ChevronDown, Download } from 'lucide-react'
import { subMonths, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const COLORS = ['#d4510c','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899','#64748b','#ef4444']

type Modal =
  | { type: 'add' }
  | { type: 'edit'; expense: Expense }
  | { type: 'category' }
  | null

const today = new Date().toISOString().slice(0, 10)
const thisMonth = new Date().toISOString().slice(0, 7)

export default function PengeluaranPage() {
  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [modal,      setModal]      = useState<Modal>(null)
  const [loading,    setLoading]    = useState(true)
  const [filterCat,  setFilterCat]  = useState('semua')
  const [filterFrom, setFilterFrom] = useState(thisMonth + '-01')
  const [filterTo,   setFilterTo]   = useState(today)

  // Form expense
  const [fName,   setFName]   = useState('')
  const [fAmt,    setFAmt]    = useState('')
  const [fDate,   setFDate]   = useState(today)
  const [fCat,    setFCat]    = useState('')
  const [fNotes,  setFNotes]  = useState('')
  const [saving,  setSaving]  = useState(false)

  // Form category
  const [cName,   setCName]   = useState('')
  const [cColor,  setCColor]  = useState(COLORS[0])
  const [cSaving, setCSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [exp, cats] = await Promise.all([fetchExpenses(filterFrom, filterTo), fetchExpenseCategories()])
    setExpenses(exp)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterFrom, filterTo])

  function openAdd() {
    setFName(''); setFAmt(''); setFDate(today); setFCat(categories[0]?.id ?? ''); setFNotes('')
    setModal({ type: 'add' })
  }
  function openEdit(e: Expense) {
    setFName(e.name); setFAmt(String(e.amount)); setFDate(e.date); setFCat(e.category_id ?? ''); setFNotes(e.notes ?? '')
    setModal({ type: 'edit', expense: e })
  }

  async function handleSave() {
    if (!fName.trim() || !fAmt) return
    setSaving(true)
    try {
      const payload = { name: fName.trim(), amount: parseFloat(fAmt.replace(/\D/g,'')) || 0, date: fDate, category_id: fCat || null, notes: fNotes }
      if (modal?.type === 'add') await saveExpense(payload)
      else if (modal?.type === 'edit') await editExpense(modal.expense.id, payload)
      setModal(null)
      await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus pengeluaran ini?')) return
    await removeExpense(id)
    await load()
  }

  async function handleAddCategory() {
    if (!cName.trim()) return
    setCSaving(true)
    await saveExpenseCategory({ name: cName.trim(), color: cColor })
    setCName(''); setCColor(COLORS[0])
    const cats = await fetchExpenseCategories()
    setCategories(cats)
    setCSaving(false)
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Hapus kategori ini? Pengeluaran terkait tidak ikut terhapus.')) return
    await removeExpenseCategory(id)
    const cats = await fetchExpenseCategories()
    setCategories(cats)
  }

  const filtered = useMemo(() =>
    expenses.filter(e => filterCat === 'semua' || e.category_id === filterCat),
    [expenses, filterCat]
  )

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  // Per-kategori breakdown
  const byCategory = categories.map(c => {
    const sum = filtered.filter(e => e.category_id === c.id).reduce((s, e) => s + e.amount, 0)
    return { ...c, total: sum }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const noCategory = filtered.filter(e => !e.category_id).reduce((s, e) => s + e.amount, 0)

  function exportCSV() {
    const headers = ['Tanggal', 'Nama', 'Kategori', 'Jumlah', 'Catatan']
    const rows = filtered.map(e => [e.date, e.name, e.category?.name ?? '-', e.amount, e.notes ?? ''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `pengeluaran-${filterFrom}-${filterTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8]"

  if (loading) return <PageSkeleton />

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Pengeluaran</h1>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Catat semua pengeluaran toko — operasional, sewa, listrik, dll</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal({ type: 'category' })}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all">
              <Tag size={14} /> Kategori
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#dddbd5] bg-white text-[#525252] text-sm font-bold rounded-xl hover:bg-[#f5f4f1] transition-all">
              <Download size={14} /> Export
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] text-white text-sm font-bold rounded-xl transition-all">
              <Plus size={14} /> Tambah
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 flex-wrap bg-white border border-[#dddbd5] rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c]" />
            <span className="text-xs text-[#8a8a8a]">s/d</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="px-3 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c]" />
          </div>
          <div className="relative">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="pl-3 pr-7 py-1.5 border-[1.5px] border-[#dddbd5] rounded-lg text-xs font-semibold bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] cursor-pointer appearance-none">
              <option value="semua">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-[#8a8a8a]">{filtered.length} item</span>
            <span className="text-sm font-extrabold text-[#d4510c]">{formatRupiah(totalFiltered)}</span>
          </div>
        </div>

        {/* Summary by category */}
        {byCategory.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {byCategory.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-[#dddbd5] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-[11px] font-bold text-[#525252] truncate">{c.name}</span>
                </div>
                <div className="text-sm font-extrabold text-[#0d0d0d]">{formatRupiah(c.total)}</div>
                <div className="text-[10px] text-[#8a8a8a] mt-0.5">
                  {totalFiltered > 0 ? Math.round(c.total / totalFiltered * 100) : 0}% dari total
                </div>
              </div>
            ))}
            {noCategory > 0 && (
              <div className="bg-white rounded-xl border border-[#dddbd5] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c0bdb8] flex-shrink-0" />
                  <span className="text-[11px] font-bold text-[#525252]">Tanpa Kategori</span>
                </div>
                <div className="text-sm font-extrabold text-[#0d0d0d]">{formatRupiah(noCategory)}</div>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-[#8a8a8a]">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dddbd5]">
            <p className="text-sm font-semibold text-[#8a8a8a]">Belum ada pengeluaran</p>
            <p className="text-xs text-[#c0bdb8] mt-1">Klik "Tambah" untuk mencatat pengeluaran</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#dddbd5] overflow-hidden">
            <div className="hidden md:grid grid-cols-[100px_1fr_120px_110px_80px] gap-3 px-5 py-2.5 bg-[#f8f7f4] border-b border-[#eceae6]">
              {['Tanggal', 'Nama & Catatan', 'Kategori', 'Jumlah', ''].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[#eceae6]">
              {filtered.map(e => (
                <div key={e.id} className="hover:bg-[#fdf9f7] transition-colors">
                  <span className="text-xs text-[#8a8a8a]">
                    {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0d0d0d] truncate">{e.name}</p>
                    {e.notes && <p className="text-[11px] text-[#8a8a8a] truncate">{e.notes}</p>}
                  </div>
                  <div>
                    {e.category ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: e.category.color + '20', color: e.category.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.category.color }} />
                        {e.category.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#c0bdb8]">—</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#0d0d0d]">{formatRupiah(e.amount)}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(e)}
                      className="p-1.5 hover:bg-[#f5f4f1] text-[#8a8a8a] hover:text-[#0d0d0d] rounded-lg transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(e.id)}
                      className="p-1.5 hover:bg-red-50 text-[#8a8a8a] hover:text-red-500 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="hidden md:grid grid-cols-[100px_1fr_120px_110px_80px] gap-3 items-center px-5 py-3 bg-[#0d0d0d]">
                <span className="text-[11px] text-white/40 col-span-3">{filtered.length} pengeluaran</span>
                <span className="text-sm font-extrabold text-[#e8784a]">{formatRupiah(totalFiltered)}</span>
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ADD/EDIT PENGELUARAN ── */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6]">
              <h3 className="font-extrabold text-[#0d0d0d]">
                {modal.type === 'add' ? 'Tambah Pengeluaran' : 'Edit Pengeluaran'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg">
                <X size={16} className="text-[#8a8a8a]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Pengeluaran *</label>
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Sewa tempat, listrik, sabun, dll" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Jumlah (Rp) *</label>
                  <input value={fAmt} onChange={e => setFAmt(e.target.value)} placeholder="0" inputMode="numeric" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Tanggal</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Kategori</label>
                <div className="relative">
                  <select value={fCat} onChange={e => setFCat(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="">Tanpa Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Catatan</label>
                <input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Opsional" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">Batal</button>
              <button onClick={handleSave} disabled={saving || !fName.trim() || !fAmt}
                className="flex-1 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KELOLA KATEGORI ── */}
      {modal?.type === 'category' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#eceae6]">
              <h3 className="font-extrabold text-[#0d0d0d]">Kelola Kategori</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-[#f5f4f1] rounded-lg">
                <X size={16} className="text-[#8a8a8a]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Tambah kategori */}
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Tambah Kategori Baru</label>
                <div className="flex gap-2">
                  <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Nama kategori"
                    className="flex-1 px-3.5 py-2.5 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] outline-none focus:border-[#d4510c] focus:bg-white transition-all" />
                  <button onClick={handleAddCategory} disabled={cSaving || !cName.trim()}
                    className="px-4 py-2.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                    {cSaving ? '...' : 'Tambah'}
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORS.map(col => (
                    <button key={col} onClick={() => setCColor(col)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${cColor === col ? 'border-[#0d0d0d] scale-110' : 'border-transparent'}`}
                      style={{ background: col }} />
                  ))}
                </div>
              </div>

              {/* List kategori */}
              {categories.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-[#f5f4f1] rounded-xl">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="flex-1 text-sm font-semibold text-[#0d0d0d]">{c.name}</span>
                      <button onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 hover:bg-red-50 text-[#c0bdb8] hover:text-red-500 rounded-lg transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 pt-0">
              <button onClick={() => setModal(null)} className="w-full py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}