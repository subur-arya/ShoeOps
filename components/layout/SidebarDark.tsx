'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, PlusCircle, Users, Tag, LogOut, Package, Menu, X } from 'lucide-react'
import type { Tenant } from '@/types'
import { useState, useEffect } from 'react'

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

function SidebarContent({ tenant, userName, onSignOut, onClose }: Props & { onClose?: () => void }) {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/operasional') return path === href
    return path.startsWith(href)
  }

  return (
    <aside className="w-[212px] bg-[#1a1a1a] flex-shrink-0 flex flex-col overflow-y-auto h-full py-5 px-3 border-r border-white/5">
      {/* Brand + Identitas Toko */}
      <div className="px-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-white font-extrabold text-[15px] tracking-tight">
            Shoe<span className="text-[#d4510c]">Ops</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-[#555] lg:hidden">
              <X size={18} />
            </button>
          )}
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
        <Link key={href} href={href} onClick={onClose}
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
        <Link key={href} href={href} onClick={onClose}
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

export function SidebarDark({ tenant, userName, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <SidebarContent tenant={tenant} userName={userName} onSignOut={onSignOut} />
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-sm text-[#888] hover:text-white transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Mobile: overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile: slide-in sidebar */}
      <div className={cn(
        'lg:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent tenant={tenant} userName={userName} onSignOut={onSignOut} onClose={() => setOpen(false)} />
      </div>
    </>
  )
}