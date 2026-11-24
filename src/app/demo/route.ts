import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

/**
 * Entrada de un clic a la cuenta de demostración del portafolio.
 *
 * El portafolio enlaza aquí para que un reclutador vea el producto sin
 * registrarse. La cuenta es compartida y solo contiene datos de ejemplo, así
 * que no se pide contraseña: si el usuario no existe (por ejemplo, tras
 * limpiar la base de datos) se vuelve al login normal.
 */
const DEMO_EMAIL = 'demo@ricardoaguilera.dev'

export async function GET(request: Request) {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const token = await signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  const response = NextResponse.redirect(new URL('/workspaces', request.url))
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
