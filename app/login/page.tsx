'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router  = useRouter()
  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Kirim ke API route yang sudah dilindungi rate limiter
      const res = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const result = await res.json()

      if (res.status === 429) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (!res.ok || !result.session) {
        const sisa = result.remaining > 0 ? ` (${result.remaining} percobaan tersisa)` : ''
        setError((result.error || 'Email atau password salah.') + sisa)
        setLoading(false)
        return
      }

      // Set session Supabase di client
      const supabase = createClient()
      await supabase.auth.setSession(result.session)

      // Ambil role dan data user
      const { data: userData } = await supabase
        .from('users')
        .select('role, name, tenant_id')
        .eq('id', result.user.id)
        .single()

      if (!userData) {
        setError('Akun tidak ditemukan di sistem.')
        setLoading(false)
        return
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('slug, token')
        .eq('id', userData.tenant_id)
        .single()

      localStorage.setItem('shoeops_user', JSON.stringify({
        id:           result.user.id,
        email:        result.user.email,
        role:         userData.role,
        name:         userData.name,
        tenant_id:    userData.tenant_id,
        tenant_slug:  tenantData?.slug  ?? 'SO',
        tenant_token: tenantData?.token ?? 'SHO-001',
      }))

      router.push(userData.role === 'owner' ? '/owner' : '/operasional')
    } catch {
      setError('Terjadi kesalahan. Periksa koneksi internet.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#d4510c] rounded-2xl mb-4 shadow-lg shadow-[#d4510c]/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 17l2-8h14l2 8H2z"/><path d="M4 9c0-3 2-5 5-5 2 0 4 1 5 3"/>
            </svg>
          </div>
          <div className="text-2xl font-extrabold text-[#0d0d0d] tracking-tight">
            Shoe<span className="text-[#d4510c]">Ops</span>
          </div>
          <p className="text-sm text-[#8a8a8a] mt-1.5">Masuk untuk melanjutkan</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-md p-7">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" required autoFocus
                value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="owner@subur.shoeops"
                className="w-full px-3.5 py-3 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none transition-all placeholder:text-[#c0bdb8] focus:border-[#d4510c] focus:bg-white focus:ring-2 focus:ring-[#d4510c]/10" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required
                  value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-3 pr-11 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none transition-all placeholder:text-[#c0bdb8] focus:border-[#d4510c] focus:bg-white focus:ring-2 focus:ring-[#d4510c]/10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-[#525252] transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 mt-2 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Masuk...</> : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#c0bdb8] mt-5">Akses hanya untuk pengguna terdaftar</p>
      </div>
    </div>
  )
}