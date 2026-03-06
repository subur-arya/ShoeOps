import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIdentifier, tooManyRequests } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit: maks 10 percobaan per 15 menit per IP
  // Setelah limit, blokir 30 menit
  const id     = getIdentifier(req, 'login')
  const result = rateLimit(id, { limit: 10, windowSec: 900, blockSec: 1800 })

  if (!result.allowed) {
    const menit = Math.ceil(result.retryAfter / 60)
    return NextResponse.json(
      { error: `Terlalu banyak percobaan login. Coba lagi dalam ${menit} menit.` },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
    )
  }

  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Login gagal — tetap hitung sebagai percobaan
      return NextResponse.json(
        { error: 'Email atau password salah.', remaining: result.remaining - 1 },
        { status: 401 }
      )
    }

    return NextResponse.json({
      session: data.session,
      user:    data.user,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}