/**
 * End-to-end smoke test against a running instance.
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
import { io } from 'socket.io-client'

const baseUrl = process.argv[2] ?? 'http://localhost:3000'
const results = []

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail })
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

class Client {
  constructor(label) {
    this.label = label
    this.cookie = ''
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (this.cookie) headers.Cookie = this.cookie

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const setCookie = res.headers.getSetCookie?.() ?? []
    for (const raw of setCookie) {
      const [pair] = raw.split(';')
      if (pair.startsWith('token=')) this.cookie = pair
    }

    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return { status: res.status, body: json }
  }

  async auth(mode, email) {
    const payload = { email, password: 'password123' }
    if (mode === 'register') {
      return this.request('/api/auth/register', {
        method: 'POST',
        body: { ...payload, name: `${email.split('@')[0]} user` },
      })
    }
    return this.request('/api/auth/login', { method: 'POST', body: payload })
  }
}

const stamp = Date.now()
const alice = new Client('alice')
const bob = new Client('bob')
const anonymous = new Client('anonymous')

// --- auth ---------------------------------------------------------------
const aliceAuth = await alice.auth('register', `alice.${stamp}@example.com`)
check('register returns 200 and a session cookie', aliceAuth.status === 200 && alice.cookie !== '')
check('weak password rejected', (await anonymous.request('/api/auth/register', { method: 'POST', body: { name: 'x', email: `weak.${stamp}@example.com`, password: '123' } })).status === 400)
check('invalid email rejected', (await anonymous.request('/api/auth/register', { method: 'POST', body: { name: 'weak', email: 'not-an-email', password: 'password123' } })).status === 400)

const bobAuth = await bob.auth('register', `bob.${stamp}@example.com`)
check('second user registered', bobAuth.status === 200 && bob.cookie !== '')

const me = await alice.request('/api/auth/me')
check('GET /api/auth/me returns the session user', me.status === 200 && me.body?.email?.startsWith('alice'))

// --- workspace / project / task ----------------------------------------
const workspace = await alice.request('/api/workspaces', { method: 'POST', body: { name: 'Smoke Workspace' } })
const workspaceId = workspace.body?.id
check('create workspace', workspace.status === 200 && Boolean(workspaceId))

const project = await alice.request(`/api/workspaces/${workspaceId}/projects`, { method: 'POST', body: { name: 'Smoke Board' } })
const projectId = project.body?.id
check('create project', project.status === 200 && Boolean(projectId))

const task = await alice.request(`/api/projects/${projectId}/tasks`, {
  method: 'POST',
  body: { title: 'Smoke task', description: 'created by smoke test', priority: 'HIGH' },
})
const taskId = task.body?.id
check('create task', task.status === 200 && Boolean(taskId))
check('task starts in TODO', task.body?.status === 'TODO')

// --- authorization ------------------------------------------------------
check('outsider cannot read board', (await bob.request(`/api/projects/${projectId}/tasks`)).status === 403)
check('outsider cannot patch task', (await bob.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status: 'DONE' } })).status === 403)
check('outsider cannot delete task', (await bob.request(`/api/tasks/${taskId}`, { method: 'DELETE' })).status === 403)
check('outsider cannot read activity', (await bob.request(`/api/workspaces/${workspaceId}/activity`)).status === 403)
check('outsider cannot read workspace', (await bob.request(`/api/workspaces/${workspaceId}`)).status === 403)
check('outsider cannot create project', (await bob.request(`/api/workspaces/${workspaceId}/projects`, { method: 'POST', body: { name: 'hack' } })).status === 403)
check('anonymous cannot read board', (await anonymous.request(`/api/projects/${projectId}/tasks`)).status === 401)

const bobId = bobAuth.body?.user?.id
const invite = await alice.request(`/api/workspaces/${workspaceId}/members`, {
  method: 'POST',
  body: { email: bobAuth.body?.user?.email, role: 'MEMBER' },
})
check('owner can invite a member', invite.status === 200)

check('member can now read board', (await bob.request(`/api/projects/${projectId}/tasks`)).status === 200)
check('member cannot create projects', (await bob.request(`/api/workspaces/${workspaceId}/projects`, { method: 'POST', body: { name: 'nope' } })).status === 403)

// --- realtime data path -------------------------------------------------
const moved = await bob.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status: 'DONE' } })
check('member can move task', moved.status === 200 && moved.body?.status === 'DONE')
check('move by member is rejected for invalid status', (await bob.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status: 'NOPE' } })).status === 400)

const assigned = await alice.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: { assigneeId: bobId } })
check('assign task to workspace member', assigned.status === 200 && assigned.body?.assignee?.id === bobId)
check('assign to non-member rejected', (await alice.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: { assigneeId: '00000000-0000-4000-8000-000000000000' } })).status === 400)

const comment = await bob.request(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { content: 'Looks good to me' } })
check('add comment', comment.status === 200 && comment.body?.content === 'Looks good to me')

const activity = await alice.request(`/api/workspaces/${workspaceId}/activity`)
check('activity feed records the move', activity.status === 200 && activity.body?.some((item) => item.action.includes('moved')))
check('activity feed records the comment', activity.body?.some((item) => item.action.includes('commented')))

const notifications = await bob.request('/api/notifications')
check('assignee gets notifications', notifications.status === 200 && notifications.body.unread > 0)
check('mark notifications read', (await bob.request('/api/notifications', { method: 'PATCH' })).status === 200)
check('unread resets', (await bob.request('/api/notifications')).body.unread === 0)

// --- pusher auth endpoint ----------------------------------------------
const pusherAuth = await anonymous.request('/api/pusher/auth', {
  method: 'POST',
  body: { socket_id: '1.2', channel_name: 'presence-project-x' },
})
check('pusher auth rejects anonymous callers', pusherAuth.status === 401)

// --- socket auth + presence --------------------------------------------
function connectWithCookie(cookie) {
  return new Promise((resolve) => {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      extraHeaders: cookie ? { Cookie: cookie } : {},
      reconnection: false,
      timeout: 4000,
    })
    const done = (result) => {
      socket.removeAllListeners()
      socket.disconnect()
      resolve(result)
    }
    socket.on('connect', () => done({ connected: true, socket }))
    socket.on('connect_error', (error) => done({ connected: false, error: error.message }))
  })
}

const anonSocket = await connectWithCookie('')
check('socket without a session is rejected', anonSocket.connected === false)

const authed = await new Promise((resolve) => {
  const socket = io(baseUrl, {
    transports: ['websocket'],
    extraHeaders: { Cookie: alice.cookie },
    reconnection: false,
    timeout: 4000,
  })
  const result = { connected: false, ack: null, presence: [] }
  const maybeResolve = () => {
    if (result.ack && result.presence.length > 0) {
      socket.disconnect()
      resolve(result)
    }
  }
  socket.on('presence:update', (payload) => {
    result.presence = payload.users
    maybeResolve()
  })
  socket.on('connect', () => {
    result.connected = true
    socket.emit('join-project', projectId, (ack) => {
      result.ack = ack
      maybeResolve()
    })
  })
  socket.on('connect_error', (error) => resolve({ connected: false, error: error.message }))
  setTimeout(() => {
    socket.disconnect()
    resolve(result)
  }, 4000)
})
check('socket with a valid session connects', authed.connected === true)
check('join-project authorized for member', authed.ack?.ok === true)
check('presence lists the connected user', authed.presence?.some((user) => user.name.includes('alice')))

// --- offline-friendly API semantics ------------------------------------
check('PATCH with empty payload rejected', (await alice.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: {} })).status === 400)
check('comment cannot be blank', (await alice.request(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { content: '   ' } })).status === 400)

const removed = await alice.request(`/api/tasks/${taskId}`, { method: 'DELETE' })
check('delete task', removed.status === 200)

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('Failures:', failed.map((result) => result.name).join(', '))
  process.exit(1)
}
