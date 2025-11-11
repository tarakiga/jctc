'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'

// Task types
type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
type TaskPriority = 1 | 2 | 3 | 4 | 5

interface Task {
  id: string
  case_id: string
  title: string
  description?: string
  assigned_to?: string
  assigned_to_name?: string
  created_by: string
  created_by_name: string
  due_at?: string
  priority: TaskPriority
  status: TaskStatus
  created_at: string
  updated_at: string
}

interface TaskManagerProps {
  caseId: string
  tasks: Task[]
  availableUsers: Array<{ id: string; full_name: string }>
  onAdd: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'case_id' | 'created_by' | 'created_by_name'>) => Promise<void>
  onEdit: (id: string, task: Partial<Task>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TaskManager({ caseId, tasks, availableUsers, onAdd, onEdit, onDelete }: TaskManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL')
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'case_id' | 'created_by' | 'created_by_name'>>({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_name: '',
    due_at: '',
    priority: 3,
    status: 'OPEN',
  })

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name,
        due_at: task.due_at,
        priority: task.priority,
        status: task.status,
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_name: '',
        due_at: '',
        priority: 3,
        status: 'OPEN',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingTask) {
        await onEdit(editingTask.id, formData)
      } else {
        await onAdd(formData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(id)
      } catch (error) {
        console.error('Error deleting task:', error)
        alert('Failed to delete task')
      }
    }
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await onEdit(task.id, { status: newStatus })
    } catch (error) {
      console.error('Error updating task status:', error)
      alert('Failed to update task status')
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getDaysUntilDue = (dueDate?: string): number | null => {
    if (!dueDate) return null
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    const variants: Record<TaskPriority, { variant: any; label: string; color: string }> = {
      5: { variant: 'critical', label: 'Critical', color: 'bg-red-600' },
      4: { variant: 'high', label: 'High', color: 'bg-orange-600' },
      3: { variant: 'medium', label: 'Medium', color: 'bg-yellow-600' },
      2: { variant: 'default', label: 'Low', color: 'bg-blue-600' },
      1: { variant: 'default', label: 'Very Low', color: 'bg-slate-600' },
    }
    return variants[priority]
  }

  const getStatusBadge = (status: TaskStatus) => {
    const variants = {
      OPEN: { variant: 'default' as const, label: 'Open', color: 'text-slate-700' },
      IN_PROGRESS: { variant: 'info' as const, label: 'In Progress', color: 'text-blue-700' },
      DONE: { variant: 'success' as const, label: 'Done', color: 'text-green-700' },
      BLOCKED: { variant: 'critical' as const, label: 'Blocked', color: 'text-red-700' },
    }
    return variants[status]
  }

  const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    const transitions: Record<TaskStatus, TaskStatus | null> = {
      OPEN: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: null,
      BLOCKED: 'IN_PROGRESS',
    }
    return transitions[currentStatus]
  }

  const filteredTasks = tasks
    .filter((task) => filterStatus === 'ALL' || task.status === filterStatus)
    .filter((task) => filterAssignee === 'ALL' || task.assigned_to === filterAssignee)
    .filter((task) => !showOverdueOnly || isOverdue(task.due_at))

  const overdueTasks = tasks.filter((task) => isOverdue(task.due_at) && task.status !== 'DONE')

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filters */}
      <div className="flex justify-between items-start">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'ALL')}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="ALL">All Status ({tasks.length})</option>
            <option value="OPEN">Open ({tasks.filter((t) => t.status === 'OPEN').length})</option>
            <option value="IN_PROGRESS">In Progress ({tasks.filter((t) => t.status === 'IN_PROGRESS').length})</option>
            <option value="DONE">Done ({tasks.filter((t) => t.status === 'DONE').length})</option>
            <option value="BLOCKED">Blocked ({tasks.filter((t) => t.status === 'BLOCKED').length})</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="ALL">All Assignees</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg text-sm cursor-pointer hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(e) => setShowOverdueOnly(e.target.checked)}
              className="rounded"
            />
            <span>Overdue Only ({overdueTasks.length})</span>
          </label>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-black text-white hover:bg-neutral-800">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-neutral-500">
              No tasks found. Click "Add Task" to create one.
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const daysUntilDue = getDaysUntilDue(task.due_at)
            const overdue = isOverdue(task.due_at)
            const nextStatus = getNextStatus(task.status)

            return (
              <Card key={task.id} className={overdue && task.status !== 'DONE' ? 'border-red-300 bg-red-50/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${getPriorityBadge(task.priority).color}`}></div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-neutral-900 mb-1">{task.title}</h3>
                          {task.description && <p className="text-sm text-neutral-600 mb-2">{task.description}</p>}
                          
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge {...getStatusBadge(task.status)}>{getStatusBadge(task.status).label}</Badge>
                            <Badge variant="default" className="bg-neutral-100">
                              P{task.priority} - {getPriorityBadge(task.priority).label}
                            </Badge>
                            
                            {task.assigned_to_name && (
                              <span className="text-neutral-600">
                                👤 {task.assigned_to_name}
                              </span>
                            )}

                            {task.due_at && (
                              <span className={overdue && task.status !== 'DONE' ? 'text-red-600 font-semibold' : 'text-neutral-600'}>
                                📅 {new Date(task.due_at).toLocaleDateString()}
                                {daysUntilDue !== null && task.status !== 'DONE' && (
                                  <span className="ml-1">
                                    ({overdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-neutral-500">
                            Created by {task.created_by_name} on {new Date(task.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {nextStatus && task.status !== 'DONE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(task, nextStatus)}
                          className="text-xs"
                        >
                          {nextStatus === 'IN_PROGRESS' && '▶️ Start'}
                          {nextStatus === 'DONE' && '✅ Complete'}
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(task, 'BLOCKED')}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          🚫 Block
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(task)} className="text-xs">
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">
                  {editingTask ? 'Edit Task' : 'Create Task'}
                </h2>
                <p className="text-slate-600 mt-1">Manage case tasks and assignments</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., Review evidence submissions"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Additional details about this task"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Assign To</label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => {
                        const userId = e.target.value
                        const user = availableUsers.find((u) => u.id === userId)
                        setFormData({
                          ...formData,
                          assigned_to: userId,
                          assigned_to_name: user?.full_name,
                        })
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Unassigned</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_at}
                      onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as TaskPriority })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="5">P5 - Critical</option>
                      <option value="4">P4 - High</option>
                      <option value="3">P3 - Medium</option>
                      <option value="2">P2 - Low</option>
                      <option value="1">P1 - Very Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
