import Link from 'next/link'

export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-[#0d0d0d] tracking-tight mb-2">Masa Trial Berakhir</h1>
        <p className="text-sm text-[#8a8a8a] leading-relaxed mb-8">
          Masa trial gratis Anda telah berakhir. Upgrade ke paket Pro untuk melanjutkan menggunakan ShoeOps.
        </p>
        <div className="bg-white rounded-2xl border border-[#dddbd5] p-6 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 border-[1.5px] border-[#dddbd5] rounded-xl text-left">
              <div className="text-xs font-bold text-[#8a8a8a] mb-1">Bulanan</div>
              <div className="text-xl font-extrabold text-[#0d0d0d]">Rp78.000</div>
              <div className="text-xs text-[#8a8a8a]">per bulan</div>
            </div>
            <div className="p-4 border-[1.5px] border-[#d4510c] bg-[#fdf0ea] rounded-xl text-left relative">
              <div className="absolute -top-2 left-3 bg-[#d4510c] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">HEMAT 7%</div>
              <div className="text-xs font-bold text-[#8a8a8a] mb-1">Tahunan</div>
              <div className="text-xl font-extrabold text-[#d4510c]">Rp870.000</div>
              <div className="text-xs text-[#8a8a8a]">per tahun</div>
            </div>
          </div>
          <button className="w-full py-3 bg-[#d4510c] hover:bg-[#b84309] text-white font-bold text-sm rounded-xl transition-colors">
            Upgrade Sekarang
          </button>
        </div>
        <Link href="/login" className="text-sm text-[#8a8a8a] hover:text-[#525252] transition-colors">← Kembali ke login</Link>
      </div>
    </div>
  )
}
