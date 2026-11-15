import { prisma } from '@/lib/prisma'

interface ActivityInput {
  userId: string
  workspaceId: string
  action: string
  entityType: 'task' | 'comment' | 'project' | 'workspace'
  entityId: string
}

export async function logActivity(input: ActivityInput) {
  try {
    await prisma.activity.create({ data: input })
  } catch (error) {
    console.error('Failed to log activity', error)
  }
}

interface NotifyInput {
  userId: string
  title: string
  message: string
}

export async function notify(input: NotifyInput) {
  try {
    await prisma.notification.create({ data: input })
  } catch (error) {
    console.error('Failed to create notification', error)
  }
}

export async function notifyAssignees(assigneeId: string, actorId: string, title: string, message: string) {
  if (assigneeId === actorId) return
  await notify({ userId: assigneeId, title, message })
}
