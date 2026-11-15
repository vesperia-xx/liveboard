import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isProtectedRoute = pathname.startsWith('/workspaces') || pathname.startsWith('/projects')

  const session = token ? await verifyToken(token) : null

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/workspaces', request.url))
  }

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/workspaces/:path*', '/projects/:path*', '/login', '/register'],
}
