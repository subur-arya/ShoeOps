'use client'
import { cn } from '@/lib/utils'

// ── Primitive ─────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-[#eceae6]', className)} />
}

// ── KPI Card ──────────────────────────────────────────────────
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm space-y-3">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-2 w-20 rounded-full" />
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────
export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  const widths = ['w-20','w-32','w-24','w-16','w-12','w-20','w-16']
  return (
    <div className="space-y-0 divide-y divide-[#eceae6]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          {widths.slice(0,5).map((w, j) => (
            <Skeleton key={j} className={`h-3 ${w} flex-shrink-0`} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Table with header ─────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  const widths = ['w-16','w-12','w-14','w-10','w-12','w-14','w-12']
  return (
    <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm overflow-hidden">
      <div className="flex gap-6 px-5 py-3 bg-[#f8f7f4] border-b border-[#eceae6]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-2 ${widths[i % widths.length]}`} />
        ))}
      </div>
      <RowSkeleton rows={rows} />
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
      {/* Target widget */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#dddbd5] p-4 shadow-sm space-y-3">
            <Skeleton className="h-3.5 w-32" />
            <div className="flex items-end gap-2 h-28">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="flex-1 rounded animate-pulse bg-[#eceae6]" style={{ height: `${35 + (j * 13) % 55}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Orders page ───────────────────────────────────────────────
export function OrdersPageSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-xl" />
        ))}
      </div>
      <TableSkeleton rows={7} cols={6} />
    </div>
  )
}

// ── Stok page ─────────────────────────────────────────────────
export function StokSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CardSkeleton /><CardSkeleton />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#dddbd5] p-4 shadow-sm">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-1.5 w-48 rounded-full" />
            </div>
            <div className="space-y-2 flex-shrink-0">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Generic page ──────────────────────────────────────────────
export function PageSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <TableSkeleton rows={cards} cols={5} />
    </div>
  )
}

// ── Analitik page ─────────────────────────────────────────────
export function AnalitikSkeleton() {
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#dddbd5] p-4 space-y-3">
            <Skeleton className="h-3.5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-2.5 flex-1 rounded-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}