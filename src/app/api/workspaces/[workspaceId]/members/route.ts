import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageWorkspace, getWorkspaceRole } from '@/lib/authz'
import { formatZodError } from '@/lib/validation'
import { logActivity, notify } from '@/lib/activity'

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
})

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  const role = await getWorkspaceRole(session.userId, workspaceId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canManageWorkspace(role)) {
    return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
  }

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const invited = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  })
  if (!invited) {
    return NextResponse.json(
      { error: 'No account found with that email. They must sign up first.' },
      { status: 404 }
    )
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: invited.id, workspaceId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  try {
    const member = await prisma.workspaceMember.create({
      data: { userId: invited.id, workspaceId, role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    await logActivity({
      userId: session.userId,
      workspaceId,
      action: `invited ${invited.name} to the workspace`,
      entityType: 'workspace',
      entityId: workspaceId,
    })

    await notify({
      userId: invited.id,
      title: 'Workspace invitation',
      message: `${session.name} added you to "${workspace?.name ?? 'a workspace'}" as ${parsed.data.role.toLowerCase()}`,
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('invite failed', error)
    return NextResponse.json({ error: 'Could not invite member' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  const role = await getWorkspaceRole(session.userId, workspaceId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const memberId = url.searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

  const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } })
  if (!target || target.workspaceId !== workspaceId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Members may remove themselves; only owners/admins may remove others.
  const removingSelf = target.userId === session.userId
  if (!removingSelf && !canManageWorkspace(role)) {
    return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 })
  }
  if (target.role === 'OWNER' && !removingSelf) {
    return NextResponse.json({ error: 'The workspace owner cannot be removed' }, { status: 403 })
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  return NextResponse.json({ success: true })
}
