import { prisma } from '@/lib/prisma'

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface ProjectAccess {
  projectId: string
  workspaceId: string
  role: WorkspaceRole
}

export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true },
  })
  return (membership?.role as WorkspaceRole) ?? null
}

export async function getProjectAccess(
  userId: string,
  projectId: string
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  })
  if (!project) return null

  const role = await getWorkspaceRole(userId, project.workspaceId)
  if (!role) return null

  return { projectId: project.id, workspaceId: project.workspaceId, role }
}

export async function getTaskAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, project: { select: { workspaceId: true } } },
  })
  if (!task) return null

  const role = await getWorkspaceRole(userId, task.project.workspaceId)
  if (!role) return null

  return {
    taskId: task.id,
    projectId: task.projectId,
    workspaceId: task.project.workspaceId,
    role,
  }
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
