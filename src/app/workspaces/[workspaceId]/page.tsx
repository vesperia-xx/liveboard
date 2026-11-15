'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityItem, NotificationItem, WorkspaceRole } from '@/lib/types'

interface WorkspaceDetail {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
  members: { id: string; role: WorkspaceRole; user: { id: string; name: string; email: string } }[]
  _count: { projects: number }
}

interface ProjectSummary {
  id: string
  name: string
  description: string | null
  _count: { tasks: number }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Request failed')
  return body as T
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [showNotifications, setShowNotifications] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => jsonFetch<WorkspaceDetail>(`/api/workspaces/${workspaceId}`),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () =>
      jsonFetch<{ role: WorkspaceRole; projects: ProjectSummary[] }>(
        `/api/workspaces/${workspaceId}/projects`
      ),
  })

  const activityQuery = useQuery({
    queryKey: ['activity', workspaceId],
    queryFn: () => jsonFetch<ActivityItem[]>(`/api/workspaces/${workspaceId}/activity`),
    refetchInterval: 15_000,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      jsonFetch<{ notifications: NotificationItem[]; unread: number }>('/api/notifications'),
    refetchInterval: 20_000,
  })

  const canManage =
    workspaceQuery.data?.role === 'OWNER' || workspaceQuery.data?.role === 'ADMIN'

  const createProject = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, description: projectDescription || null }),
      }),
    onSuccess: () => {
      setProjectName('')
      setProjectDescription('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['activity', workspaceId] })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  const inviteMember = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      setInviteEmail('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['activity', workspaceId] })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  const markNotificationsRead = useMutation({
    mutationFn: () => jsonFetch('/api/notifications', { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (workspaceQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading workspace…
      </div>
    )
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
        <p className="text-base font-medium text-white">Workspace not available</p>
        <p className="max-w-sm text-sm text-zinc-400">
          {(workspaceQuery.error as Error)?.message ?? 'You may not have access to this workspace.'}
        </p>
        <Link href="/workspaces" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to workspaces
        </Link>
      </div>
    )
  }

  const workspace = workspaceQuery.data
  const projects = projectsQuery.data?.projects ?? []
  const unread = notificationsQuery.data?.unread ?? 0

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-8">
        <div className="min-w-0">
          <button
            onClick={() => router.push('/workspaces')}
            className="mb-1 block text-xs text-indigo-400 hover:text-indigo-300"
          >
            ← All workspaces
          </button>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold text-white">{workspace.name}</h1>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
              {workspace.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications((value) => !value)
                if (unread > 0) markNotificationsRead.mutate()
              }}
              className="relative rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 z-30 mt-2 w-80 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Notifications
                </p>
                {(notificationsQuery.data?.notifications.length ?? 0) === 0 ? (
                  <p className="px-1 py-2 text-sm text-zinc-500">You’re all caught up.</p>
                ) : (
                  notificationsQuery.data?.notifications.map((notification) => (
                    <div key={notification.id} className="rounded-lg bg-zinc-800/60 p-2">
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                      <p className="text-xs text-zinc-400">{notification.message}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:mx-8">
          {error}
        </div>
      )}

      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Projects ({projects.length})
              </h2>
            </div>

            {projectsQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Loading projects…</p>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-sm text-zinc-400">No projects yet.</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Create one to start a Kanban board with realtime sync.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{project.name}</h3>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        {project._count.tasks} tasks
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {project.description ?? 'No description'}
                    </p>
                    <span className="mt-3 inline-block text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                      Open board →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {canManage && (
              <form
                className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!projectName.trim()) return
                  createProject.mutate()
                }}
              >
                <h3 className="text-sm font-semibold text-white">New project</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Project name"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    value={projectDescription}
                    onChange={(event) => setProjectDescription(event.target.value)}
                    placeholder="Short description (optional)"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createProject.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createProject.isPending ? 'Creating…' : 'Create project'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Activity
            </h2>
            {activityQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Loading activity…</p>
            ) : (activityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-zinc-500">No activity yet. Move a task to see it here.</p>
            ) : (
              <ol className="space-y-3">
                {activityQuery.data?.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200">
                        <span className="font-medium text-white">{item.user.name}</span>{' '}
                        {item.action}
                      </p>
                      <p className="text-[11px] text-zinc-500">{relativeTime(item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Members ({workspace.members.length})
            </h2>
            <ul className="space-y-2">
              {workspace.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{member.user.name}</p>
                    <p className="truncate text-xs text-zinc-500">{member.user.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>

            {canManage && (
              <form
                className="mt-4 space-y-2 border-t border-zinc-800 pt-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!inviteEmail.trim()) return
                  inviteMember.mutate()
                }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Invite by email
                </h3>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as 'ADMIN' | 'MEMBER')}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-200"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteMember.isPending}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {inviteMember.isPending ? 'Inviting…' : 'Invite'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  The person must already have an account.
                </p>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
