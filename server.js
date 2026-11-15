const { Server: SocketIOServer } = require('socket.io')
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

/** projectId -> Map<userId, { name, connections }> */
const presence = new Map()

function readToken(cookieHeader = '') {
  const match = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('token='))
  if (!match) return null
  const raw = match.slice('token='.length)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function verifySession(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (!payload || typeof payload !== 'object' || !payload.userId) return null
    return { userId: payload.userId, name: payload.name, email: payload.email }
  } catch {
    return null
  }
}

function presenceList(projectId) {
  const room = presence.get(projectId)
  if (!room) return []
  return Array.from(room.entries()).map(([userId, value]) => ({
    userId,
    name: value.name,
    connections: value.connections,
  }))
}

function removePresence(projectId, userId) {
  const room = presence.get(projectId)
  if (!room) return
  const entry = room.get(userId)
  if (!entry) return
  entry.connections -= 1
  if (entry.connections <= 0) room.delete(userId)
  if (room.size === 0) presence.delete(projectId)
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const io = new SocketIOServer(server, {
    cors: { origin: process.env.APP_ORIGIN || '*', methods: ['GET', 'POST'] },
  })
  // Expose the io instance so API routes can publish events (see src/lib/realtime.ts).
  globalThis.__io = io

  // Authenticate every connection from the httpOnly session cookie.
  io.use((socket, nextMiddleware) => {
    const token = readToken(socket.handshake.headers.cookie)
    const user = token ? verifySession(token) : null
    if (!user) return nextMiddleware(new Error('Unauthorized'))
    socket.data.user = user
    nextMiddleware()
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    let joinedProjectId = null

    socket.on('join-project', async (projectId, ack) => {
      if (typeof projectId !== 'string' || !projectId) return

      try {
        // Authorization: the user must belong to the workspace that owns the project.
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { workspaceId: true },
        })
        if (!project) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Project not found' })
          return
        }

        const membership = await prisma.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId: user.userId, workspaceId: project.workspaceId } },
          select: { id: true },
        })
        if (!membership) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Forbidden' })
          return
        }

        if (joinedProjectId && joinedProjectId !== projectId) {
          socket.leave(`project:${joinedProjectId}`)
          removePresence(joinedProjectId, user.userId)
          io.to(`project:${joinedProjectId}`).emit('presence:update', {
            projectId: joinedProjectId,
            users: presenceList(joinedProjectId),
          })
        }

        joinedProjectId = projectId
        socket.join(`project:${projectId}`)

        if (!presence.has(projectId)) presence.set(projectId, new Map())
        const room = presence.get(projectId)
        const entry = room.get(user.userId)
        if (entry) entry.connections += 1
        else room.set(user.userId, { name: user.name, connections: 1 })

        io.to(`project:${projectId}`).emit('presence:update', {
          projectId,
          users: presenceList(projectId),
        })

        if (typeof ack === 'function') ack({ ok: true })
      } catch (error) {
        console.error('join-project failed', error)
        if (typeof ack === 'function') ack({ ok: false, error: 'Internal error' })
      }
    })

    // Note: task/comment mutations publish via globalThis.__io (see src/lib/realtime.ts).
    // The client never emits data events, keeping the server authoritative.

    socket.on('disconnect', () => {
      if (!joinedProjectId) return
      removePresence(joinedProjectId, user.userId)
      io.to(`project:${joinedProjectId}`).emit('presence:update', {
        projectId: joinedProjectId,
        users: presenceList(joinedProjectId),
      })
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
