export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string }
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  projectId: string
  assignee: { id: string; name: string } | null
  labels: Label[]
  comments: Comment[]
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  role: WorkspaceRole
  user: { id: string; name: string; email: string }
}

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  role: WorkspaceRole
  workspace: {
    id: string
    name: string
    members: WorkspaceMember[]
  }
  tasks: Task[]
}

export interface PresenceUser {
  userId: string
  name: string
  connections: number
}

export interface CurrentUser {
  id: string
  name: string
  email: string
}

export interface ActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  user: { id: string; name: string }
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'DONE', label: 'Done' },
]

export const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'bg-zinc-500/15 text-zinc-300 border-zinc-600/40',
  MEDIUM: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  HIGH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  URGENT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}
