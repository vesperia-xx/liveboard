'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoWordmark } from '@/components/logo'

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/workspaces')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkspaces(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        setWorkspaces([...workspaces, { ...data, role: 'OWNER' }])
        setName('')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Loading workspaces...</div>
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <LogoWordmark />
            </Link>
            <div className="hidden border-l border-zinc-800 pl-4 sm:block">
              <h1 className="text-base font-semibold leading-tight text-white">Your workspaces</h1>
              <p className="text-xs text-zinc-500">Create, open or manage your teams</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Create Workspace</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Acme Inc"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Select Workspace</h2>
            {workspaces.length === 0 ? (
              <p className="text-sm text-zinc-500">No workspaces yet. Create one to get started.</p>
            ) : (
              <div className="space-y-2">
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => router.push(`/workspaces/${ws.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 hover:border-zinc-700 hover:bg-zinc-800 transition-all"
                  >
                    <div>
                      <h3 className="font-medium text-white">{ws.name}</h3>
                      <span className="text-xs text-zinc-400 capitalize">Role: {ws.role.toLowerCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-indigo-400">Open →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
