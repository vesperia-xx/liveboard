import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProjectAccess } from '@/lib/authz'
import { createTaskSchema, formatZodError } from '@/lib/validation'
import { logActivity, notifyAssignees } from '@/lib/activity'
import { getWorkspaceRole } from '@/lib/authz'
import { publishProjectEvent } from '@/lib/realtime'

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const access = await getProjectAccess(session.userId, projectId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          labels: true,
          comments: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  return NextResponse.json({ ...project, role: access.role })
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const access = await getProjectAccess(session.userId, projectId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const { assigneeId, dueDate, ...rest } = parsed.data

  if (assigneeId) {
    const assigneeRole = await getWorkspaceRole(assigneeId, access.workspaceId)
    if (!assigneeRole) {
      return NextResponse.json({ error: 'Assignee is not a workspace member' }, { status: 400 })
    }
  }

  try {
    const task = await prisma.task.create({
      data: {
        ...rest,
        description: rest.description ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        labels: true,
        comments: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    await logActivity({
      userId: session.userId,
      workspaceId: access.workspaceId,
      action: `created task "${task.title}"`,
      entityType: 'task',
      entityId: task.id,
    })

    if (assigneeId) {
      await notifyAssignees(
        assigneeId,
        session.userId,
        'Task assigned',
        `${session.name} assigned you "${task.title}"`
      )
    }

    await publishProjectEvent(projectId, 'task-created', task)

    return NextResponse.json(task)
  } catch (error) {
    console.error('create task failed', error)
    return NextResponse.json({ error: 'Could not create task' }, { status: 500 })
  }
}
