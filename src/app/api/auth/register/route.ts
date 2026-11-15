import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { registerSchema, formatZodError } from '@/lib/validation'

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const { email, password, name } = parsed.data

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, name, passwordHash } })

    const token = await signToken({ userId: user.id, email: user.email, name: user.name })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })
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
  } catch (error) {
    console.error('register failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
