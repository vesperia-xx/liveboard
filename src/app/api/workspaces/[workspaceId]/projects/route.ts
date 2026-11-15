import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceRole, canManageWorkspace } from '@/lib/authz'
import { createProjectSchema, formatZodError } from '@/lib/validation'
import { logActivity } from '@/lib/activity'

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  const role = await getWorkspaceRole(session.userId, workspaceId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ role, projects })
}

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  const role = await getWorkspaceRole(session.userId, workspaceId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canManageWorkspace(role)) {
    return NextResponse.json({ error: 'Only owners and admins can create projects' }, { status: 403 })
  }

  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        workspaceId,
      },
    })

    await logActivity({
      userId: session.userId,
      workspaceId,
      action: `created project "${project.name}"`,
      entityType: 'project',
      entityId: project.id,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('create project failed', error)
    return NextResponse.json({ error: 'Could not create project' }, { status: 500 })
  }
}
