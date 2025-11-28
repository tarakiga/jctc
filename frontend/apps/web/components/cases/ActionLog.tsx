'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'

// Action types
type ActionType = 
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'STATUS_CHANGED'
  | 'PARTY_ADDED'
  | 'PARTY_UPDATED'
  | 'PARTY_REMOVED'
  | 'ASSIGNMENT_ADDED'
  | 'ASSIGNMENT_REMOVED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'NOTE_ADDED'
  | 'MANUAL_ENTRY'

interface Action {
  id: string
  case_id: string
  action_type: ActionType
  action_details: string
  performed_by: string
  performed_by_name: string
  timestamp: string
  metadata?: Record<string, any>
}

interface ActionLogProps {
  caseId: string
  actions: Action[]
  onAddManualEntry: (action: Omit<Action, 'id' | 'timestamp' | 'case_id' | 'performed_by' | 'performed_by_name'>) => Promise<void>
}

export function ActionLog({ caseId: _caseId, actions, onAddManualEntry }: ActionLogProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterType, setFilterType] = useState<ActionType | 'ALL'>('ALL')
  const [formData, setFormData] = useState({
    action_details: '',
    metadata: {},
  })

  const handleOpenModal = () => {
    setFormData({
      action_details: '',
      metadata: {},
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await onAddManualEntry({
        action_type: 'MANUAL_ENTRY',
        action_details: formData.action_details,
        metadata: formData.metadata,
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error adding manual action:', error)
      alert('Failed to add action entry')
    }
  }

  const getActionIcon = (actionType: ActionType) => {
    const icons: Record<ActionType, string> = {
      CASE_CREATED: '📝',
      CASE_UPDATED: '✏️',
      STATUS_CHANGED: '🔄',
      PARTY_ADDED: '👤',
      PARTY_UPDATED: '👤',
      PARTY_REMOVED: '🚫',
      ASSIGNMENT_ADDED: '🎯',
      ASSIGNMENT_REMOVED: '❌',
      EVIDENCE_ADDED: '🔍',
      EVIDENCE_UPDATED: '🔍',
      TASK_CREATED: '✅',
      TASK_UPDATED: '✏️',
      TASK_COMPLETED: '✔️',
      NOTE_ADDED: '📌',
      MANUAL_ENTRY: '✍️',
    }
    return icons[actionType] || '📋'
  }

  const getActionColor = (actionType: ActionType): string => {
    const colors: Record<ActionType, string> = {
      CASE_CREATED: 'bg-green-100 border-green-200',
      CASE_UPDATED: 'bg-blue-100 border-blue-200',
      STATUS_CHANGED: 'bg-purple-100 border-purple-200',
      PARTY_ADDED: 'bg-indigo-100 border-indigo-200',
      PARTY_UPDATED: 'bg-indigo-100 border-indigo-200',
      PARTY_REMOVED: 'bg-red-100 border-red-200',
      ASSIGNMENT_ADDED: 'bg-teal-100 border-teal-200',
      ASSIGNMENT_REMOVED: 'bg-orange-100 border-orange-200',
      EVIDENCE_ADDED: 'bg-cyan-100 border-cyan-200',
      EVIDENCE_UPDATED: 'bg-cyan-100 border-cyan-200',
      TASK_CREATED: 'bg-lime-100 border-lime-200',
      TASK_UPDATED: 'bg-amber-100 border-amber-200',
      TASK_COMPLETED: 'bg-green-100 border-green-200',
      NOTE_ADDED: 'bg-yellow-100 border-yellow-200',
      MANUAL_ENTRY: 'bg-slate-100 border-slate-200',
    }
    return colors[actionType] || 'bg-slate-100 border-slate-200'
  }

  const formatActionType = (actionType: ActionType): string => {
    return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredActions = actions.filter((action) => filterType === 'ALL' || action.action_type === filterType)

  // Sort actions by timestamp (most recent first)
  const sortedActions = [...filteredActions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Filter */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActionType | 'ALL')}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white hover:border-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
          >
            <option value="ALL">All Actions ({actions.length})</option>
            <option value="CASE_CREATED">Case Created</option>
            <option value="CASE_UPDATED">Case Updated</option>
            <option value="STATUS_CHANGED">Status Changed</option>
            <option value="PARTY_ADDED">Party Added</option>
            <option value="PARTY_UPDATED">Party Updated</option>
            <option value="PARTY_REMOVED">Party Removed</option>
            <option value="ASSIGNMENT_ADDED">Assignment Added</option>
            <option value="ASSIGNMENT_REMOVED">Assignment Removed</option>
            <option value="EVIDENCE_ADDED">Evidence Added</option>
            <option value="EVIDENCE_UPDATED">Evidence Updated</option>
            <option value="TASK_CREATED">Task Created</option>
            <option value="TASK_UPDATED">Task Updated</option>
            <option value="TASK_COMPLETED">Task Completed</option>
            <option value="NOTE_ADDED">Note Added</option>
            <option value="MANUAL_ENTRY">Manual Entry</option>
          </select>
        </div>
        <Button onClick={handleOpenModal} className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Manual Entry
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {sortedActions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No actions recorded</h3>
              <p className="text-slate-600 mb-6">
                {filterType !== 'ALL'
                  ? `No ${formatActionType(filterType)} actions found.`
                  : 'Activity will appear here as the case progresses.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>

            {sortedActions.map((action) => (
              <div key={action.id} className="relative flex gap-3">
                {/* Timeline dot */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-3 border-white shadow-sm flex items-center justify-center text-lg ${getActionColor(action.action_type)}`}>
                  {getActionIcon(action.action_type)}
                </div>

                {/* Action card - more compact */}
                <Card className="flex-1 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {formatActionType(action.action_type)}
                          </h3>
                          <Badge variant="default" className="text-xs bg-slate-100 text-slate-600">
                            {formatTimestamp(action.timestamp)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700">{action.action_details}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {action.performed_by_name}
                          </span>
                          <span>•</span>
                          <span>{new Date(action.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata display (if available) - more compact */}
                    {action.metadata && Object.keys(action.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Details:</p>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          {Object.entries(action.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                              <span className="truncate">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Manual Entry Modal */}
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
                <h2 className="text-3xl font-bold text-slate-900">Add Manual Entry</h2>
                <p className="text-slate-600 mt-1">Record a manual action or note for this case</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
                {/* Action Details */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Action Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.action_details}
                    onChange={(e) => setFormData({ ...formData, action_details: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Describe the action taken, observation, or note..."
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    This entry will be recorded in the case audit trail with your name and timestamp.
                  </p>
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800">
                  Add Entry
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
