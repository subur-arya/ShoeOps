'use client'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AkunNonaktifPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('shoeops_user')
    localStorage.removeItem('shoeops_store_info')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#dddbd5] shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h1 className="text-lg font-extrabold text-[#0d0d0d] mb-2">Masa Aktif Akun Habis</h1>
        <p className="text-sm text-[#525252] leading-relaxed mb-6">
          Masa aktif akun toko Anda telah berakhir. Silakan hubungi admin untuk memperpanjang langganan.
        </p>
        <div className="bg-[#f5f4f1] rounded-xl p-4 text-left space-y-2 mb-6">
          <p className="text-[11px] font-bold text-[#8a8a8a] uppercase tracking-widest">Hubungi Admin</p>
          <a href="https://wa.me/6282334454006" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-[#0d0d0d] hover:text-[#d4510c] transition-colors">
            <span>💬</span> WhatsApp Admin
          </a>
        </div>
        <button onClick={handleSignOut}
          className="w-full py-2.5 border border-[#dddbd5] text-[#525252] font-bold text-sm rounded-xl hover:bg-[#f5f4f1] transition-all">
          Keluar
        </button>
      </div>
    </div>
  )
}