'use client'

import { useState } from 'react'
import { Button } from '@jctc/ui'
import { DeleteTaskModal, StartTaskModal, CompleteTaskModal, BlockTaskModal } from './TaskActionModals'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DatePicker } from '@/components/ui/DatePicker'
import { TaskCard } from './TaskCard'

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

  // Fetch task_status and task_priority lookup values
  const {
    [LOOKUP_CATEGORIES.TASK_STATUS]: taskStatusLookup,
    [LOOKUP_CATEGORIES.TASK_PRIORITY]: taskPriorityLookup
  } = useLookups([
    LOOKUP_CATEGORIES.TASK_STATUS,
    LOOKUP_CATEGORIES.TASK_PRIORITY
  ])

  // Premium modal states
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null })
  const [startModal, setStartModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null })
  const [completeModal, setCompleteModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null })
  const [blockModal, setBlockModal] = useState<{ isOpen: boolean; task: Task | null }>({ isOpen: false, task: null })
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
    try {
      await onDelete(id)
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus, blockReason?: string) => {
    try {
      const updates: any = { status: newStatus }
      if (blockReason) {
        updates.notes = `${task.description || ''}\n\n[BLOCKED] ${blockReason}`
      }
      await onEdit(task.id, updates)
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

  // Status pills configuration
  const statusFilters: { status: TaskStatus | 'ALL'; label: string; icon: string }[] = [
    { status: 'ALL', label: 'All Tasks', icon: '📋' },
    { status: 'OPEN', label: 'Open', icon: '○' },
    { status: 'IN_PROGRESS', label: 'In Progress', icon: '⏳' },
    { status: 'BLOCKED', label: 'Blocked', icon: '⛔' },
    { status: 'DONE', label: 'Done', icon: '✅' },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Tasks</h3>
        <Button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </Button>
      </div>

      {/* Pill Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const count = filter.status === 'ALL' ? tasks.length : tasks.filter((t) => t.status === filter.status).length
            const isActive = filterStatus === filter.status
            return (
              <button
                key={filter.status}
                onClick={() => setFilterStatus(filter.status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {filter.icon} {filter.label} ({count})
              </button>
            )
          })}
        </div>

        <div className="h-6 w-px bg-slate-300"></div>

        {/* Assignee Filter */}
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-full text-sm font-medium bg-white hover:border-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
        >
          <option value="ALL">All Assignees</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>

        {/* Overdue Filter */}
        <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-full text-sm font-medium cursor-pointer hover:bg-slate-50 transition-all">
          <input
            type="checkbox"
            checked={showOverdueOnly}
            onChange={(e) => setShowOverdueOnly(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>Overdue ({overdueTasks.length})</span>
        </label>
      </div>

      {/* Task Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No tasks found</h3>
            <p className="text-slate-600 mb-6">
              {filterStatus !== 'ALL' || filterAssignee !== 'ALL' || showOverdueOnly
                ? 'Try adjusting your filters.'
                : 'Create your first task to get started.'}
            </p>
            <Button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const daysUntilDue = getDaysUntilDue(task.due_at)
            const overdue = isOverdue(task.due_at)
            const nextStatus = getNextStatus(task.status)
            const priorityInfo = getPriorityBadge(task.priority)
            const statusInfo = getStatusBadge(task.status)

            return (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => handleOpenModal(task)}
                onDelete={() => setDeleteModal({ isOpen: true, task })}
                onStart={() => setStartModal({ isOpen: true, task })}
                onComplete={() => setCompleteModal({ isOpen: true, task })}
                onBlock={() => setBlockModal({ isOpen: true, task })}
              />
            )

          })}
        </div>
      )}

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
                    <DatePicker
                      label="Due Date"
                      value={formData.due_at || ''}
                      onChange={(value) => setFormData({ ...formData, due_at: value })}
                      placeholder="Select due date"
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

      {/* Premium Action Modals */}
      <DeleteTaskModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, task: null })}
        onConfirm={() => {
          if (deleteModal.task) {
            handleDelete(deleteModal.task.id)
          }
        }}
        taskTitle={deleteModal.task?.title || ''}
      />

      <StartTaskModal
        isOpen={startModal.isOpen}
        onClose={() => setStartModal({ isOpen: false, task: null })}
        onConfirm={() => {
          if (startModal.task) {
            handleStatusChange(startModal.task, 'IN_PROGRESS')
          }
        }}
        taskTitle={startModal.task?.title || ''}
      />

      <CompleteTaskModal
        isOpen={completeModal.isOpen}
        onClose={() => setCompleteModal({ isOpen: false, task: null })}
        onConfirm={() => {
          if (completeModal.task) {
            handleStatusChange(completeModal.task, 'DONE')
          }
        }}
        taskTitle={completeModal.task?.title || ''}
      />

      <BlockTaskModal
        isOpen={blockModal.isOpen}
        onClose={() => setBlockModal({ isOpen: false, task: null })}
        onConfirm={(reason) => {
          if (blockModal.task) {
            handleStatusChange(blockModal.task, 'BLOCKED', reason)
          }
        }}
        taskTitle={blockModal.task?.title || ''}
      />
    </div>
  )
}
