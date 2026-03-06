import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import type { OrderStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID')
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy', { locale: id })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'd MMM', { locale: id })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy HH:mm', { locale: id })
}

export function formatTimeOnly(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: id })
}

export function daysSince(date: string | Date): number {
  return differenceInDays(new Date(), new Date(date))
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id })
}

export const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bg: string
  dot: string
  animated?: boolean
}> = {
  diterima: {
    label: 'Diterima',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    dot: 'bg-blue-600',
  },
  diproses: {
    label: 'Sedang Diproses',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-600',
    animated: true,
  },
  selesai: {
    label: 'Selesai',
    color: 'text-green-700',
    bg: 'bg-green-50',
    dot: 'bg-green-600',
  },
  diantar: {
    label: 'Sedang Diantar',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    dot: 'bg-orange-500',
  },
}

export const STATUS_STEPS: OrderStatus[] = ['diterima', 'diproses', 'selesai', 'diantar']

export function getStatusStep(status: OrderStatus): number {
  return STATUS_STEPS.indexOf(status)
}

export async function generateOrderCode(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase
    .from('orders')
    .select('order_code')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)

  const last = data?.[0]?.order_code
  const lastNum = last ? parseInt(last.replace('SO-', '')) : 1000
  const next = lastNum + 1
  return `SO-${next}`
}

export function generateInsights(stats: {
  monthRevenue: number
  lastMonthRevenue: number
  topTreatment?: string
  dormantCount: number
  busiestDay?: string
  avgTransaction: number
  lastAvgTransaction?: number
  peakHour?: string
}): string[] {
  const insights: string[] = []

  if (stats.lastMonthRevenue > 0) {
    const pct = Math.round((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100)
    if (pct > 0) insights.push(`Pendapatan bulan ini naik ${pct}% dibanding bulan lalu.`)
    else if (pct < 0) insights.push(`Pendapatan bulan ini turun ${Math.abs(pct)}% dibanding bulan lalu.`)
    else insights.push(`Pendapatan bulan ini sama dengan bulan lalu.`)
  }

  if (stats.topTreatment) {
    insights.push(`${stats.topTreatment} adalah treatment paling diminati bulan ini.`)
  }

  if (stats.dormantCount > 0) {
    insights.push(`${stats.dormantCount} customer belum kembali dalam 30 hari terakhir.`)
  }

  if (stats.busiestDay) {
    insights.push(`${stats.busiestDay} adalah hari paling ramai minggu ini.`)
  }

  if (stats.peakHour) {
    insights.push(`Jam ${stats.peakHour} adalah waktu tersibuk. Siapkan staff lebih di jam tersebut.`)
  }

  return insights
}
