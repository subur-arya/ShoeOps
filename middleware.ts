import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/owner') || path.startsWith('/operasional')
  const isLoginPage = path === '/login'

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Cek masa aktif akun — skip halaman expired itu sendiri
  if (isProtected && user && path !== '/akun-nonaktif') {
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userData?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('active_until')
        .eq('id', userData.tenant_id)
        .single()

      if (tenant?.active_until) {
        const expired = new Date(tenant.active_until) < new Date(new Date().toISOString().slice(0, 10))
        if (expired) {
          return NextResponse.redirect(new URL('/akun-nonaktif', request.url))
        }
      }
    }
  }

  if (isLoginPage && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const dest = userData?.role === 'owner' ? '/owner' : '/operasional'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

export const config = {
  matcher: ['/owner/:path*', '/operasional/:path*', '/login', '/akun-nonaktif'],
}