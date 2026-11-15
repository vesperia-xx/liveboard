'use client'

import { useEffect, useRef, useState } from 'react'
import Pusher, { type PresenceChannel } from 'pusher-js'
import { io } from 'socket.io-client'
import type { PresenceUser, Task } from '@/lib/types'

export type ConnectionState = 'connecting' | 'online' | 'offline'

export interface ProjectChannelHandlers {
  onTaskCreated: (task: Task) => void
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (payload: { taskId: string }) => void
  onCommentCreated: (payload: { taskId: string; comment: Task['comments'][number] }) => void
  onReconnect: () => void
}

function memberList(members: { each?: (cb: (member: { id: string; info?: { name?: string } }) => void) => void }) {
  const users: PresenceUser[] = []
  members?.each?.((member) => {
    users.push({
      userId: member.id,
      name: member.info?.name ?? member.id,
      connections: 1,
    })
  })
  return users
}

/**
 * Subscribes to a project's realtime channel.
 * - When NEXT_PUBLIC_PUSHER_KEY is set, uses Pusher (presence channel, works on Vercel).
 * - Otherwise falls back to the local Socket.io server (server.js).
 * REST remains the source of truth; joining a channel requires a workspace membership.
 */
export function useProjectChannel(projectId: string, handlers: ProjectChannelHandlers) {
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const call = <K extends keyof ProjectChannelHandlers>(key: K) => handlersRef.current[key]
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY

    if (pusherKey) {
      const pusher = new Pusher(pusherKey, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu',
        authEndpoint: '/api/pusher/auth',
      })

      pusher.connection.bind('connected', () => {
        setConnection('online')
        call('onReconnect')()
      })
      pusher.connection.bind('connecting', () => setConnection('connecting'))
      pusher.connection.bind('disconnected', () => setConnection('offline'))
      pusher.connection.bind('error', () => setConnection('offline'))

      const channel = pusher.subscribe(
        `presence-project-${projectId}`
      ) as unknown as PresenceChannel
      channel.bind('pusher:subscription_succeeded', (members: { each?: (cb: (member: { id: string; info?: { name?: string } }) => void) => void }) => {
        setConnection('online')
        setPresence(memberList(members))
      })
      channel.bind('pusher:subscription_error', () => setConnection('offline'))
      channel.bind('pusher:member_added', () => setPresence(memberList(channel.members)))
      channel.bind('pusher:member_removed', () => setPresence(memberList(channel.members)))
      channel.bind('task-created', (task: Task) => call('onTaskCreated')(task))
      channel.bind('task-updated', (task: Task) => call('onTaskUpdated')(task))
      channel.bind('task-deleted', (payload: { taskId: string }) => call('onTaskDeleted')(payload))
      channel.bind('comment-created', (payload: { taskId: string; comment: Task['comments'][number] }) =>
        call('onCommentCreated')(payload)
      )

      return () => {
        channel.unbind_all()
        channel.unsubscribe()
        pusher.disconnect()
      }
    }

    const socket = io()

    socket.on('connect', () => {
      setConnection('online')
      socket.emit('join-project', projectId, (ack?: { ok: boolean; error?: string }) => {
        if (ack && !ack.ok) setConnection('offline')
      })
      call('onReconnect')()
    })
    socket.on('disconnect', () => setConnection('offline'))
    socket.on('connect_error', () => setConnection('offline'))
    socket.on('presence:update', (payload: { projectId: string; users: PresenceUser[] }) => {
      if (payload.projectId === projectId) setPresence(payload.users)
    })
    socket.on('task-created', (task: Task) => call('onTaskCreated')(task))
    socket.on('task-updated', (task: Task) => call('onTaskUpdated')(task))
    socket.on('task-deleted', (payload: { taskId: string }) => call('onTaskDeleted')(payload))
    socket.on('comment-created', (payload: { taskId: string; comment: Task['comments'][number] }) =>
      call('onCommentCreated')(payload)
    )

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return { connection, presence }
}
