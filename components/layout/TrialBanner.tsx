import Link from 'next/link'
import { differenceInDays } from 'date-fns'

export function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const days = Math.max(0, differenceInDays(new Date(trialEndsAt), new Date()))
  if (days > 14) return null
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#1e1208] to-[#2a1a08] rounded-xl px-4 py-3 mb-4">
      <span className="text-sm text-white/60">
        <strong className="text-white">Masa Trial</strong> — {days} hari lagi sebelum perlu upgrade.
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold bg-[#d4510c] text-white px-3 py-1 rounded-full">{days} hari tersisa</span>
        <Link href="/upgrade"
          className="text-xs font-bold bg-[#d4510c] hover:bg-[#b84309] text-white px-3 py-1.5 rounded-lg transition-colors">
          Upgrade
        </Link>
      </div>
    </div>
  )
}
