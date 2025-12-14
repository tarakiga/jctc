import { Badge, Button, Card, CardContent } from '@jctc/ui'
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'

// Types (mirrored from parent for now, or could be imported if centralized)
type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
type TaskPriority = 1 | 2 | 3 | 4 | 5

export interface Task {
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

interface TaskCardProps {
    task: Task
    onEdit: (task: Task) => void
    onDelete: (task: Task) => void
    onStart: (task: Task) => void
    onComplete: (task: Task) => void
    onBlock: (task: Task) => void
}

export function TaskCard({ task, onEdit, onDelete, onStart, onComplete, onBlock }: TaskCardProps) {
    const isOverdue = task.due_at ? isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at)) : false

    // Format Date Logic
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null
        const date = new Date(dateStr)
        if (isToday(date)) return 'Today'
        if (isTomorrow(date)) return 'Tomorrow'
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    // Priority Config
    const getPriorityConfig = (priority: TaskPriority) => {
        switch (priority) {
            case 5: return { color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Critical' }
            case 4: return { color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'High' }
            case 3: return { color: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Medium' }
            case 2: return { color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Low' }
            default: return { color: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', label: 'Low' }
        }
    }

    // Status Config
    const getStatusConfig = (status: TaskStatus) => {
        switch (status) {
            case 'DONE': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Done', border: 'border-emerald-200' }
            case 'IN_PROGRESS': return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress', border: 'border-blue-200' }
            case 'BLOCKED': return { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Blocked', border: 'border-rose-200' }
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Open', border: 'border-slate-200' }
        }
    }

    const priorityConfig = getPriorityConfig(task.priority)
    const statusConfig = getStatusConfig(task.status)

    return (
        <div className={`group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 overflow-hidden flex flex-col h-full ${isOverdue && task.status !== 'DONE' ? 'ring-1 ring-red-100' : ''
            }`}>
            {/* Left Priority Stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityConfig.color}`} />

            <div className="p-5 flex flex-col h-full">
                {/* Header: Status & Menu */}
                <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(task)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(task)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Title & Description */}
                <div className="mb-4 flex-grow">
                    <h3 className={`text-base font-semibold text-slate-900 mb-1 leading-snug line-clamp-2 ${task.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                    </h3>
                    {task.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                            {task.description}
                        </p>
                    )}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-xs mt-auto pt-4 border-t border-slate-100/80">
                    {/* Assignee */}
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border border-white shadow-sm text-[10px] font-bold text-slate-600">
                            {task.assigned_to_name ? task.assigned_to_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-slate-600 font-medium truncate max-w-[100px]">
                            {task.assigned_to_name || 'Unassigned'}
                        </span>
                    </div>

                    {/* Date */}
                    {task.due_at && (
                        <div className={`flex items-center gap-1.5 ${isOverdue && task.status !== 'DONE' ? 'text-red-600 font-bold' : 'text-slate-500 font-medium'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                                {formatDate(task.due_at)}
                                {isOverdue && task.status !== 'DONE' && ' (!)'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Quick Actions Footer (Hover only or specific states) */}
                {task.status !== 'DONE' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {task.status === 'OPEN' && (
                            <button
                                onClick={() => onStart(task)}
                                className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm border border-slate-200 transition-all"
                            >
                                Start Task
                            </button>
                        )}

                        {task.status === 'IN_PROGRESS' && (
                            <>
                                <button
                                    onClick={() => onBlock(task)}
                                    className="flex items-center justify-center gap-1 py-1.5 bg-white text-slate-500 text-xs font-semibold rounded-md border border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                    Block
                                </button>
                                <button
                                    onClick={() => onComplete(task)}
                                    className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100 hover:bg-emerald-100 hover:shadow-sm transition-all"
                                >
                                    Complete
                                </button>
                            </>
                        )}

                        {task.status === 'BLOCKED' && (
                            <button
                                onClick={() => onStart(task)} // Reuse start to unblock/resume
                                className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100 hover:bg-blue-100 transition-all"
                            >
                                Resume Task
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
