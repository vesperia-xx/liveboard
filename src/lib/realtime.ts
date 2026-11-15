import Pusher from 'pusher'

let pusher: Pusher | null = null

export function getPusher(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    return null
  }

  if (!pusher) {
    pusher = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    })
  }

  return pusher
}

export function presenceChannel(projectId: string) {
  return `presence-project-${projectId}`
}

/**
 * Publishes a project event to everyone subscribed to the project.
 * Prefers Pusher when the env vars are set (Vercel / managed), and falls back to the
 * Socket.io instance owned by server.js in local development.
 */
export async function publishProjectEvent(
  projectId: string,
  event: string,
  payload: unknown
) {
  const client = getPusher()
  if (client) {
    try {
      // The presence channel authorizes membership, so it doubles as the data channel.
      await client.trigger(presenceChannel(projectId), event, payload)
    } catch (error) {
      console.error('pusher publish failed', error)
    }
    return { transport: 'pusher' }
  }

  const io = (globalThis as {
    __io?: { to: (room: string) => { emit: (e: string, p: unknown) => void } }
  }).__io
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload)
    return { transport: 'socket.io' }
  }

  console.warn('realtime disabled: set PUSHER_* env vars or run through server.js')
  return { transport: 'none' }
}
