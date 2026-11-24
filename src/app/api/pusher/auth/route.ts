import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPusher, presenceChannel } from '@/lib/realtime'

/**
 * Pusher envía el cuerpo como `application/x-www-form-urlencoded`, mientras
 * que una llamada propia puede usar JSON. Aceptamos ambos: leer solo JSON
 * hacía que toda suscripción fallara con 400 y el tablero se marcara offline.
 */
async function readAuthBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as {
      socket_id?: string
      channel_name?: string
    } | null

    return { socketId: body?.socket_id, channelName: body?.channel_name }
  }

  const form = await request.formData().catch(() => null)

  return {
    socketId: form?.get('socket_id')?.toString(),
    channelName: form?.get('channel_name')?.toString(),
  }
}

export async function POST(request: Request) {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { socketId, channelName } = await readAuthBody(request)

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'socket_id and channel_name are required' }, { status: 400 })
  }

  const prefix = 'presence-project-'
  if (!channelName.startsWith(prefix)) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 403 })
  }

  const projectId = channelName.slice(prefix.length)

  // Authorization: the user must belong to the workspace that owns the project.
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.userId, workspaceId: project.workspaceId } },
    select: { id: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pusher = getPusher()
  if (!pusher) {
    return NextResponse.json({ error: 'Realtime is not configured (missing PUSHER_* env vars)' }, { status: 503 })
  }

  const auth = pusher.authorizeChannel(socketId, presenceChannel(projectId), {
    user_id: session.userId,
    user_info: { name: session.name, email: session.email },
  })

  return NextResponse.json(auth)
}
