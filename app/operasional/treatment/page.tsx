'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useEffect, useState } from 'react'
import { formatRupiah } from '@/lib/utils'
import { fetchTreatments } from '@/lib/api'
import type { Treatment } from '@/types'
import { Tag } from 'lucide-react'

export default function OpsTreatmentPage() {
  const [treats, setTreats] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTreatments().then(t => { setTreats(t); setLoading(false) }) }, [])

  const active   = treats.filter(t =>  t.is_active)
  const inactive = treats.filter(t => !t.is_active)

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Daftar Treatment</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">{active.length} treatment aktif tersedia</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4]">
          <span className="text-xs font-bold text-[#0d0d0d]">Treatment Aktif</span>
        </div>
        {active.length === 0 ? (
          <p className="text-center py-10 text-sm text-[#8a8a8a]">Belum ada treatment aktif.</p>
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {active.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${
                  i === 0 ? 'bg-[#fef9e7] text-[#92600a]' : 'bg-[#f5f4f1] text-[#8a8a8a]'
                }`}>{i + 1}</div>
                <span className="flex-1 text-sm font-semibold text-[#0d0d0d]">{t.name}</span>
                <span className="text-sm font-extrabold text-[#d4510c]">{formatRupiah(t.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#eceae6] bg-[#f8f7f4]">
            <span className="text-xs font-bold text-[#8a8a8a]">Tidak Tersedia</span>
          </div>
          <div className="divide-y divide-[#eceae6]">
            {inactive.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 opacity-50">
                <Tag size={14} className="text-[#8a8a8a] flex-shrink-0" />
                <span className="flex-1 text-sm text-[#8a8a8a] line-through">{t.name}</span>
                <span className="text-sm font-bold text-[#8a8a8a]">{formatRupiah(t.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-[#8a8a8a] text-center">Untuk mengubah treatment, hubungi owner toko.</p>
    </div>
  )
}