'use client'
import { SidebarLight } from '@/components/layout/SidebarLight'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Tenant } from '@/types'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const [ready,    setReady]    = useState(false)
  const [userName, setUserName] = useState('')
  const [tenant,   setTenant]   = useState<Tenant | null>(null)

  useEffect(() => {
    async function load() {
      const stored = localStorage.getItem('shoeops_user')
      if (!stored) { router.push('/login'); return }
      const user = JSON.parse(stored)
      if (user.role !== 'owner') { router.push('/operasional'); return }
      setUserName(user.name)

      // Load tenant dari Supabase
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.tenant_id)
          .single()
        if (data) setTenant(data as Tenant)
      } catch (e) {
        console.error('gagal load tenant:', e)
      }

      setReady(true)
    }
    load()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('shoeops_user')
    router.push('/login')
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f4f1]">
        <Loader2 size={28} className="animate-spin text-[#d4510c]" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarLight tenant={tenant} userName={userName} onSignOut={signOut} />
      <div className="flex-1 overflow-y-auto bg-[#f5f4f1] pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  )
}