import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTaskAccess, getWorkspaceRole } from '@/lib/authz'
import { updateTaskSchema, formatZodError } from '@/lib/validation'
import { logActivity, notifyAssignees } from '@/lib/activity'
import { publishProjectEvent } from '@/lib/realtime'

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await params
  const access = await getTaskAccess(session.userId, taskId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const { dueDate, assigneeId, ...rest } = parsed.data

  if (assigneeId) {
    const assigneeRole = await getWorkspaceRole(assigneeId, access.workspaceId)
    if (!assigneeRole) {
      return NextResponse.json({ error: 'Assignee is not a workspace member' }, { status: 400 })
    }
  }

  try {
    const before = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, status: true, assigneeId: true },
    })
    if (!before) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true } },
        labels: true,
        comments: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    if (rest.status && rest.status !== before.status) {
      await logActivity({
        userId: session.userId,
        workspaceId: access.workspaceId,
        action: `moved "${task.title}" to ${STATUS_LABELS[rest.status] ?? rest.status}`,
        entityType: 'task',
        entityId: task.id,
      })
    } else if (assigneeId !== undefined && assigneeId !== before.assigneeId) {
      await logActivity({
        userId: session.userId,
        workspaceId: access.workspaceId,
        action: assigneeId
          ? `assigned "${task.title}" to ${task.assignee?.name ?? 'a teammate'}`
          : `unassigned "${task.title}"`,
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
    } else if (rest.title && rest.title !== before.title) {
      await logActivity({
        userId: session.userId,
        workspaceId: access.workspaceId,
        action: `renamed "${before.title}" to "${rest.title}"`,
        entityType: 'task',
        entityId: task.id,
      })
    }

    await publishProjectEvent(access.projectId, 'task-updated', task)

    return NextResponse.json(task)
  } catch (error) {
    console.error('update task failed', error)
    return NextResponse.json({ error: 'Could not update task' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await params
  const access = await getTaskAccess(session.userId, taskId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const task = await prisma.task.delete({
      where: { id: taskId },
      select: { title: true },
    })

    await logActivity({
      userId: session.userId,
      workspaceId: access.workspaceId,
      action: `deleted task "${task.title}"`,
      entityType: 'task',
      entityId: taskId,
    })

    await publishProjectEvent(access.projectId, 'task-deleted', { taskId })

    return NextResponse.json({ success: true, projectId: access.projectId })
  } catch (error) {
    console.error('delete task failed', error)
    return NextResponse.json({ error: 'Could not delete task' }, { status: 404 })
  }
}
