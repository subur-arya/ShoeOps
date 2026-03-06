'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart2, TrendingUp, Activity, ClipboardList, Users, Tag, Settings, LogOut, Percent, Package, Printer, TrendingDown, Wrench } from 'lucide-react'
import type { Tenant } from '@/types'

const MAIN_NAV = [
  { href: '/owner',          label: 'Dashboard',          icon: BarChart2  },
  { href: '/owner/analitik', label: 'Analitik & Laporan', icon: TrendingUp },
  { href: '/owner/performa', label: 'Performa Toko',      icon: Activity   },
]
const MGMT_NAV = [
  { href: '/owner/pesanan',    label: 'Semua Pesanan',     icon: ClipboardList },
  { href: '/owner/customer',   label: 'Customer',          icon: Users         },
  { href: '/owner/treatment',  label: 'Treatment & Harga', icon: Tag           },
  { href: '/owner/diskon',     label: 'Diskon & Promo',    icon: Percent       },
  { href: '/owner/pengeluaran',label: 'Pengeluaran',       icon: TrendingDown  },
  { href: '/owner/stok',             label: 'Stok Bahan Baku',     icon: Package  },
  { href: '/owner/stok/bahan',       label: 'Bahan per Treatment',  icon: Package  },
  { href: '/owner/alat',             label: 'Alat & Peralatan',     icon: Wrench   },
  { href: '/owner/alat/treatment',   label: 'Alat per Treatment',   icon: Wrench   },
  { href: '/owner/pengaturan-struk', label: 'Pengaturan Struk',     icon: Printer  },
  { href: '/owner/pengaturan/status', label: 'Status Pesanan',       icon: Settings },
  { href: '/owner/pengaturan', label: 'Pengaturan',        icon: Settings      },
]

interface Props {
  tenant: Tenant | null
  userName?: string
  onSignOut: () => void
}

export function SidebarLight({ tenant, userName, onSignOut }: Props) {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/owner') return path === href
    // exact match atau path diikuti '/' (bukan prefix sebagian)
    return path === href || path.startsWith(href + '/')
  }

  return (
    <aside className="w-[230px] bg-white border-r border-[#eceae6] flex-shrink-0 flex flex-col overflow-y-auto h-full py-5 px-3">
      {/* Brand */}
      <div className="px-3 mb-6">
        <div className="text-[#0d0d0d] font-extrabold text-[15px] tracking-tight">
          Shoe<span className="text-[#d4510c]">Ops</span>
        </div>
        {tenant ? (
          <div className="mt-2 bg-[#f5f4f1] rounded-xl px-3 py-2 border border-[#eceae6]">
            <div className="text-[9px] font-bold text-[#c0bdb8] uppercase tracking-widest mb-0.5">Toko</div>
            <div className="text-[13px] font-extrabold text-[#0d0d0d] leading-tight">{tenant.name}</div>
            {tenant.token && (
              <div className="text-[10px] text-[#d4510c] font-mono font-bold mt-0.5 uppercase tracking-wider">{tenant.token}</div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-[#8a8a8a] mt-0.5 font-medium">Owner Dashboard</div>
        )}
      </div>

      <div className="text-[10px] font-bold text-[#c0bdb8] uppercase tracking-widest px-3 mb-1.5">Analitik</div>
      {MAIN_NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-0.5',
            isActive(href)
              ? 'bg-[#fdf0ea] text-[#d4510c] font-bold'
              : 'text-[#525252] hover:bg-[#f5f4f1] hover:text-[#0d0d0d]'
          )}>
          <Icon size={15} strokeWidth={1.8} />
          {label}
        </Link>
      ))}

      <div className="h-px bg-[#eceae6] my-3 mx-1" />
      <div className="text-[10px] font-bold text-[#c0bdb8] uppercase tracking-widest px-3 mb-1.5">Manajemen</div>
      {MGMT_NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-0.5',
            isActive(href)
              ? 'bg-[#fdf0ea] text-[#d4510c] font-bold'
              : 'text-[#525252] hover:bg-[#f5f4f1] hover:text-[#0d0d0d]'
          )}>
          <Icon size={15} strokeWidth={1.8} />
          {label}
        </Link>
      ))}

      <div className="mt-auto">
        <div className="h-px bg-[#eceae6] my-3 mx-1" />

        {/* Masa aktif akun */}
        {tenant?.active_until && (() => {
          const until    = new Date(tenant.active_until)
          const today    = new Date(new Date().toISOString().slice(0, 10))
          const diffDays = Math.ceil((until.getTime() - today.getTime()) / 86400000)
          const label    = until.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          const isDanger  = diffDays <= 3
          const isWarning = diffDays <= 14
          return (
            <div className={`mx-1 mb-3 px-3 py-2.5 rounded-xl border text-[11px] ${
              isDanger  ? 'bg-red-50 border-red-200 text-red-700' :
              isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="font-bold mb-0.5 flex items-center gap-1">
                <span>{isDanger ? '🔴' : isWarning ? '🟡' : '🟢'}</span>
                Masa Aktif
              </div>
              <div className="font-medium">{label}</div>
              <div className="opacity-75 mt-0.5">
                {diffDays > 0 ? `${diffDays} hari lagi` : 'Habis hari ini'}
              </div>
            </div>
          )
        })()}

        {userName && (
          <div className="px-3 py-2.5 mb-1">
            <div className="text-[9px] font-bold text-[#c0bdb8] uppercase tracking-widest">Login sebagai</div>
            <div className="text-[12px] font-semibold text-[#525252] mt-0.5">{userName}</div>
          </div>
        )}
        <button onClick={onSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#8a8a8a] hover:text-[#0d0d0d] hover:bg-[#f5f4f1] transition-all w-full">
          <LogOut size={15} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  )
}