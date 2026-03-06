/**
 * Simple in-memory rate limiter untuk Next.js API routes (Node runtime).
 * Tidak perlu Redis — cocok untuk self-host single-instance.
 */

interface RateLimitEntry {
  count:     number
  resetAt:   number
  blockedAt: number | null   // kapan pertama kali diblokir (untuk block duration)
}

// Global store — persist selama server hidup
const store = new Map<string, RateLimitEntry>()

// Bersihkan entry lama setiap 5 menit
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt + 60_000) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Berapa request maksimal dalam window */
  limit:        number
  /** Durasi window dalam detik */
  windowSec:    number
  /** Durasi blokir setelah limit tercapai (detik). Default = windowSec */
  blockSec?:    number
}

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetIn:    number   // detik sampai reset
  retryAfter: number   // detik sampai boleh coba lagi (0 jika allowed)
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now       = Date.now()
  const windowMs  = config.windowSec * 1000
  const blockMs   = (config.blockSec ?? config.windowSec) * 1000

  let entry = store.get(identifier)

  // Reset window kalau sudah lewat
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs, blockedAt: null }
  }

  // Cek apakah masih dalam masa blokir
  if (entry.blockedAt !== null) {
    const blockedUntil = entry.blockedAt + blockMs
    if (now < blockedUntil) {
      store.set(identifier, entry)
      return {
        allowed:    false,
        remaining:  0,
        resetIn:    Math.ceil((entry.resetAt - now) / 1000),
        retryAfter: Math.ceil((blockedUntil - now) / 1000),
      }
    }
    // Masa blokir selesai, reset
    entry = { count: 0, resetAt: now + windowMs, blockedAt: null }
  }

  entry.count++

  // Baru saja melewati limit
  if (entry.count > config.limit) {
    if (entry.blockedAt === null) entry.blockedAt = now
    store.set(identifier, entry)
    return {
      allowed:    false,
      remaining:  0,
      resetIn:    Math.ceil((entry.resetAt - now) / 1000),
      retryAfter: config.blockSec ?? config.windowSec,
    }
  }

  store.set(identifier, entry)
  return {
    allowed:    true,
    remaining:  config.limit - entry.count,
    resetIn:    Math.ceil((entry.resetAt - now) / 1000),
    retryAfter: 0,
  }
}

/**
 * Ambil identifier dari request — IP + path sebagai key.
 * Gunakan X-Forwarded-For kalau di balik proxy/Nginx.
 */
export function getIdentifier(req: Request, suffix = ''): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip        = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const url       = new URL(req.url)
  return `${ip}:${url.pathname}${suffix ? ':' + suffix : ''}`
}

/**
 * Helper: kembalikan Response 429 yang sudah diformat.
 */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error:   'Terlalu banyak permintaan. Coba lagi nanti.',
      retryAfter,
    }),
    {
      status:  429,
      headers: {
        'Content-Type':  'application/json',
        'Retry-After':   String(retryAfter),
        'X-RateLimit-Limit': '0',
      },
    }
  )
}