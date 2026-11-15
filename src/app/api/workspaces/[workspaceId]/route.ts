import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceRole } from '@/lib/authz'

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  const role = await getWorkspaceRole(session.userId, workspaceId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { projects: true } },
    },
  })

  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  return NextResponse.json({ ...workspace, role })
}
