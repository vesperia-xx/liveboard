import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTaskAccess } from '@/lib/authz'
import { createCommentSchema, formatZodError } from '@/lib/validation'
import { logActivity, notify } from '@/lib/activity'
import { publishProjectEvent } from '@/lib/realtime'

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await params
  const access = await getTaskAccess(session.userId, taskId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(comments)
}

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await params
  const access = await getTaskAccess(session.userId, taskId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = createCommentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, assigneeId: true },
    })

    const comment = await prisma.comment.create({
      data: { content: parsed.data.content, taskId, userId: session.userId },
      include: { user: { select: { id: true, name: true } } },
    })

    await logActivity({
      userId: session.userId,
      workspaceId: access.workspaceId,
      action: `commented on "${task?.title ?? 'a task'}"`,
      entityType: 'comment',
      entityId: comment.id,
    })

    if (task?.assigneeId && task.assigneeId !== session.userId) {
      await notify({
        userId: task.assigneeId,
        title: 'New comment',
        message: `${session.name} commented on "${task.title}"`,
      })
    }

    await publishProjectEvent(access.projectId, 'comment-created', { taskId, comment })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('create comment failed', error)
    return NextResponse.json({ error: 'Could not create comment' }, { status: 500 })
  }
}
