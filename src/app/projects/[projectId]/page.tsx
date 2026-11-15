'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  PRIORITY_STYLES,
  STATUS_COLUMNS,
  type CurrentUser,
  type Priority,
  type ProjectResponse,
  type Task,
  type TaskStatus,
} from '@/lib/types'
import { useProjectChannel } from '@/lib/use-project-channel'

interface TaskPatch {
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
  assigneeId?: string | null
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatDue(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function fetchProject(projectId: string): Promise<ProjectResponse> {
  const res = await fetch(`/api/projects/${projectId}/tasks`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Could not load project')
  return data
}

async function fetchMe(): Promise<CurrentUser> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) throw new Error('Could not load session')
  return res.json()
}

export default function KanbanBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const queryClient = useQueryClient()
  const router = useRouter()
  const queryKey = useMemo(() => ['project', projectId] as const, [projectId])

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [commentDraft, setCommentDraft] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: 60_000 })

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchProject(projectId),
  })

  const tasks = data?.tasks ?? []
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timeout)
  }, [toast])

  const { connection, presence } = useProjectChannel(projectId, {
    onTaskCreated: (task) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) => {
        if (!old) return old
        if (old.tasks.some((existing) => existing.id === task.id)) return old
        return { ...old, tasks: [task, ...old.tasks] }
      })
    },
    onTaskUpdated: (task) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old
          ? { ...old, tasks: old.tasks.map((existing) => (existing.id === task.id ? task : existing)) }
          : old
      )
    },
    onTaskDeleted: ({ taskId }) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old ? { ...old, tasks: old.tasks.filter((existing) => existing.id !== taskId) } : old
      )
      setSelectedTaskId((current) => (current === taskId ? null : current))
    },
    onCommentCreated: ({ taskId, comment }) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((existing) => {
                if (existing.id !== taskId) return existing
                const already = existing.comments.some((existingComment) => existingComment.id === comment.id)
                return already
                  ? existing
                  : { ...existing, comments: [...existing.comments, comment] }
              }),
            }
          : old
      )
    },
    onReconnect: () => {
      // Recover any events missed while disconnected.
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  const patchTask = useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: TaskPatch; optimistic: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Update failed')
      return body as Task
    },
    onMutate: async ({ taskId, optimistic }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ProjectResponse>(queryKey)
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((task) => (task.id === taskId ? { ...task, ...optimistic } : task)),
            }
          : old
      )
      return { previous }
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      setToast(mutationError.message || 'Could not save your change')
    },
    onSuccess: (task) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old ? { ...old, tasks: old.tasks.map((existing) => (existing.id === task.id ? task : existing)) } : old
      )
    },
  })

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Could not create task')
      return body as Task
    },
    onSuccess: (task) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old ? { ...old, tasks: [task, ...old.tasks] } : old
      )
      setShowNewTask(false)
      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      setAssigneeId('')
      setDueDate('')
    },
    onError: (mutationError) => setToast(mutationError.message),
  })

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Could not delete task')
      return taskId
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ProjectResponse>(queryKey)
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old ? { ...old, tasks: old.tasks.filter((task) => task.id !== taskId) } : old
      )
      return { previous }
    },
    onError: (mutationError, _taskId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      setToast(mutationError.message)
    },
    onSuccess: (taskId) => {
      setSelectedTaskId(null)
    },
  })

  const addComment = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Could not post comment')
      return { taskId, comment: body as Task['comments'][number] }
    },
    onSuccess: ({ taskId, comment }) => {
      queryClient.setQueryData<ProjectResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((task) =>
                task.id === taskId ? { ...task, comments: [...task.comments, comment] } : task
              ),
            }
          : old
      )
      setCommentDraft('')
    },
    onError: (mutationError) => setToast(mutationError.message),
  })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const overId = event.over?.id
    const task = tasks.find((item) => item.id === event.active.id)
    if (!task || typeof overId !== 'string' || !overId.startsWith('col:')) return

    const nextStatus = overId.slice(4) as TaskStatus
    if (task.status === nextStatus) return

    patchTask.mutate({ taskId: task.id, patch: { status: nextStatus }, optimistic: { status: nextStatus } })
  }

  const changeAssignee = (value: string) => {
    if (!selectedTask) return
    const nextAssigneeId = value || null
    const member = data?.workspace.members.find((item) => item.user.id === nextAssigneeId)
    patchTask.mutate({
      taskId: selectedTask.id,
      patch: { assigneeId: nextAssigneeId },
      optimistic: { assignee: member ? { id: member.user.id, name: member.user.name } : null },
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading board…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
        <p className="text-base font-medium text-white">This board is not available</p>
        <p className="max-w-sm text-sm text-zinc-400">
          {(error as Error)?.message ?? 'You may not be a member of this workspace.'}
        </p>
        <button
          onClick={() => router.push('/workspaces')}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Back to workspaces
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {connection !== 'online' && (
        <div className="bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-300">
          {connection === 'connecting'
            ? 'Connecting to live sync…'
            : 'You are offline — changes will sync when the connection returns.'}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 sm:px-8 sm:py-4">
        <div className="min-w-0">
          <button
            onClick={() => router.push(`/workspaces/${data.workspace.id}`)}
            className="mb-1 block text-xs text-indigo-400 hover:text-indigo-300"
          >
            ← Back to {data.workspace.name}
          </button>
          <h1 className="truncate text-lg font-bold text-white sm:text-xl">{data.name}</h1>
          {data.description && <p className="truncate text-xs text-zinc-400">{data.description}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2" title={presence.map((user) => user.name).join(', ')}>
            {presence.slice(0, 4).map((user) => (
              <span
                key={user.userId}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-indigo-600 text-[10px] font-semibold text-white"
              >
                {initials(user.name)}
              </span>
            ))}
            {presence.length > 4 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-[10px] font-semibold text-white">
                +{presence.length - 4}
              </span>
            )}
          </div>
          {presence.length > 0 && (
            <span className="hidden text-xs text-zinc-400 sm:inline">
              {presence.length} viewing
            </span>
          )}
          <button
            onClick={() => setShowNewTask(true)}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 sm:px-4"
          >
            + New task
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-x-auto p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              tasks={tasks.filter((task) => task.status === column.id)}
              onOpenTask={setSelectedTaskId}
              onAddTask={() => setShowNewTask(true)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          members={data.workspace.members}
          role={data.role}
          me={me}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setSelectedTaskId(null)}
          onAssigneeChange={changeAssignee}
          onPriorityChange={(nextPriority) =>
            patchTask.mutate({
              taskId: selectedTask.id,
              patch: { priority: nextPriority },
              optimistic: { priority: nextPriority },
            })
          }
          onDueDateChange={(value) =>
            patchTask.mutate({
              taskId: selectedTask.id,
              patch: { dueDate: value ? new Date(value).toISOString() : null },
              optimistic: { dueDate: value ? new Date(value).toISOString() : null },
            })
          }
          onStatusChange={(nextStatus) =>
            patchTask.mutate({
              taskId: selectedTask.id,
              patch: { status: nextStatus },
              optimistic: { status: nextStatus },
            })
          }
          onDelete={() => deleteTask.mutate(selectedTask.id)}
          onComment={() => {
            const content = commentDraft.trim()
            if (!content) return
            addComment.mutate({ taskId: selectedTask.id, content })
          }}
          commenting={addComment.isPending}
        />
      )}

      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create task</h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!title.trim()) return
                createTask.mutate()
              }}
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300">Title</label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ship realtime sync"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional context…"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as Priority)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Due date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {data.workspace.members.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewTask(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTask.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createTask.isPending ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm text-rose-200 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function KanbanColumn({
  id,
  label,
  tasks,
  onOpenTask,
  onAddTask,
}: {
  id: TaskStatus
  label: string
  tasks: Task[]
  onOpenTask: (taskId: string) => void
  onAddTask: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` })

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[200px] flex-col rounded-xl border p-3 transition-colors ${
        isOver ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900/60'
      }`}
    >
      <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
        <h2 className="text-sm font-semibold text-white">{label}</h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 space-y-2">
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">
            Drop tasks here
          </p>
        )}
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
        ))}
      </div>

      <button
        onClick={onAddTask}
        className="mt-3 w-full rounded-lg border border-dashed border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
      >
        + Add task
      </button>
    </section>
  )
}

function KanbanCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      className={`cursor-grab rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-sm transition-colors hover:border-zinc-700 active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardBody task={task} />
    </article>
  )
}

function TaskCardPreview({ task }: { task: Task }) {
  return (
    <article className="w-[260px] rotate-1 cursor-grabbing rounded-lg border border-indigo-500/50 bg-zinc-900 p-3 shadow-2xl">
      <TaskCardBody task={task} />
    </article>
  )
}

function TaskCardBody({ task }: { task: Task }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-white">{task.title}</h3>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>
      {task.description && <p className="line-clamp-2 text-xs text-zinc-400">{task.description}</p>}
      <div className="flex items-center justify-between pt-1 text-xs text-zinc-500">
        <span>
          {task.assignee ? `👤 ${task.assignee.name}` : 'Unassigned'}
          {task.comments.length > 0 && ` · 💬 ${task.comments.length}`}
        </span>
        {task.dueDate && <span>{formatDue(task.dueDate)}</span>}
      </div>
    </div>
  )
}

function TaskDrawer({
  task,
  members,
  me,
  commentDraft,
  commenting,
  onClose,
  onAssigneeChange,
  onPriorityChange,
  onDueDateChange,
  onStatusChange,
  onDelete,
  onComment,
  onCommentDraftChange,
}: {
  task: Task
  members: ProjectResponse['workspace']['members']
  role: ProjectResponse['role']
  me?: CurrentUser
  commentDraft: string
  commenting: boolean
  onClose: () => void
  onAssigneeChange: (value: string) => void
  onPriorityChange: (value: Priority) => void
  onDueDateChange: (value: string) => void
  onStatusChange: (value: TaskStatus) => void
  onDelete: () => void
  onComment: () => void
  onCommentDraftChange: (value: string) => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-white">{task.title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        {task.description && <p className="mb-4 text-sm text-zinc-400">{task.description}</p>}

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="block text-xs text-zinc-500">Status</span>
            <select
              value={task.status}
              onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
            >
              {STATUS_COLUMNS.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-zinc-500">Priority</span>
            <select
              value={task.priority}
              onChange={(event) => onPriorityChange(event.target.value as Priority)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-zinc-500">Assignee</span>
            <select
              value={task.assignee?.id ?? ''}
              onChange={(event) => onAssigneeChange(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-zinc-500">Due date</span>
            <input
              type="date"
              value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={(event) => onDueDateChange(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
            />
          </label>
        </div>

        <div className="flex-1 border-t border-zinc-800 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Comments {task.comments.length > 0 && `(${task.comments.length})`}
          </h3>
          <div className="space-y-3">
            {task.comments.length === 0 && (
              <p className="text-xs text-zinc-500">No comments yet. Start the conversation.</p>
            )}
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-medium text-zinc-300">{comment.user.name}</span>
                  <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-zinc-200">{comment.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  onComment()
                }
              }}
              placeholder={me ? `Comment as ${me.name}…` : 'Write a comment…'}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={onComment}
              disabled={commenting || !commentDraft.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        <button
          onClick={onDelete}
          className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
        >
          Delete task
        </button>
      </aside>
    </div>
  )
}
