import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createWorkspaceSchema, formatZodError } from '@/lib/validation'

export const runtime = 'nodejs'

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'workspace'}-${Math.random().toString(36).slice(2, 7)}`
}

export async function GET() {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.userId },
    include: {
      workspace: {
        include: { _count: { select: { projects: true, members: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(
    memberships.map((membership) => ({
      ...membership.workspace,
      role: membership.role,
      projectCount: membership.workspace._count.projects,
      memberCount: membership.workspace._count.members,
    }))
  )
}

export async function POST(request: Request) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createWorkspaceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        members: { create: { userId: session.userId, role: 'OWNER' } },
      },
    })

    return NextResponse.json({
      ...workspace,
      role: 'OWNER',
      projectCount: 0,
      memberCount: 1,
    })
  } catch (error) {
    console.error('create workspace failed', error)
    return NextResponse.json({ error: 'Could not create workspace' }, { status: 500 })
  }
}
