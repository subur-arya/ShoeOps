'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppUser, Tenant } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', userData.tenant_id)
          .single()
        if (tenantData) setTenant(tenantData)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, tenant, loading, signOut }
}
