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

  const activities = await prisma.activity.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(activities)
}
