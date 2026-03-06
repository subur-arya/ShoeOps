'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, PlusCircle, Users, Tag, LogOut, Package } from 'lucide-react'
import type { Tenant } from '@/types'

const NAV = [
  { href: '/operasional',         label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/operasional/pesanan', label: 'Daftar Pesanan', icon: ClipboardList   },
  { href: '/operasional/input',   label: 'Input Pesanan',  icon: PlusCircle      },
  { href: '/operasional/stok',    label: 'Stok & Alat',    icon: Package         },
]
const DATA_NAV = [
  { href: '/operasional/customer',  label: 'Customer',  icon: Users },
  { href: '/operasional/treatment', label: 'Treatment', icon: Tag   },
]

interface Props {
  tenant: Tenant | null
  userName?: string
  onSignOut: () => void
}

export function SidebarDark({ tenant, userName, onSignOut }: Props) {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/operasional') return path === href
    return path.startsWith(href)
  }

  return (
    <aside className="w-[212px] bg-[#1a1a1a] flex-shrink-0 flex flex-col overflow-y-auto h-full py-5 px-3 border-r border-white/5">
      {/* Brand + Identitas Toko */}
      <div className="px-3 mb-6">
        <div className="text-white font-extrabold text-[15px] tracking-tight">
          Shoe<span className="text-[#d4510c]">Ops</span>
        </div>
        {tenant ? (
          <div className="mt-2.5 bg-white/5 rounded-xl px-3 py-2.5 border border-white/8">
            <div className="text-[9px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-1">Toko</div>
            <div className="text-[13px] font-extrabold text-white leading-tight">{tenant.name}</div>
            {tenant.token && (
              <div className="text-[10px] text-[#d4510c] font-mono font-bold mt-0.5 uppercase tracking-wider">{tenant.token}</div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-[#3a3a3a] mt-0.5 font-medium">Operasional</div>
        )}
      </div>

      <div className="text-[10px] font-bold text-[#2e2e2e] uppercase tracking-widest px-3 mb-1.5">Menu Utama</div>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-0.5',
            isActive(href)
              ? 'bg-[#d4510c] text-white font-semibold shadow-sm'
              : 'text-[#555] hover:bg-white/5 hover:text-[#aaa]'
          )}>
          <Icon size={15} strokeWidth={1.8} />
          {label}
        </Link>
      ))}

      <div className="h-px bg-white/5 my-3 mx-1" />
      <div className="text-[10px] font-bold text-[#2e2e2e] uppercase tracking-widest px-3 mb-1.5">Data</div>
      {DATA_NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-0.5',
            isActive(href)
              ? 'bg-[#d4510c] text-white font-semibold'
              : 'text-[#555] hover:bg-white/5 hover:text-[#aaa]'
          )}>
          <Icon size={15} strokeWidth={1.8} />
          {label}
        </Link>
      ))}

      <div className="mt-auto">
        <div className="h-px bg-white/5 my-3 mx-1" />
        {userName && (
          <div className="px-3 py-2.5 mb-1">
            <div className="text-[9px] font-bold text-[#2e2e2e] uppercase tracking-widest">Login sebagai</div>
            <div className="text-[12px] font-semibold text-[#555] mt-0.5">{userName}</div>
          </div>
        )}
        <button onClick={onSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#444] hover:bg-white/5 hover:text-[#888] transition-all w-full">
          <LogOut size={15} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  )
}