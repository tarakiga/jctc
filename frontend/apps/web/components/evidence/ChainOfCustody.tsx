'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'

// Chain of custody types
type CustodyAction = 
  | 'COLLECTED'
  | 'SEIZED' 
  | 'TRANSFERRED' 
  | 'ANALYZED' 
  | 'PRESENTED_COURT' 
  | 'RETURNED' 
  | 'DISPOSED'

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface CustodyEntry {
  id: string
  evidence_id: string
  action: CustodyAction
  from_person?: string
  from_person_name?: string
  to_person: string
  to_person_name: string
  location: string
  purpose: string
  notes?: string
  signature_path?: string
  signature_verified: boolean
  timestamp: string
  performed_by: string
  performed_by_name: string
  // Four-eyes approval (for sensitive actions)
  requires_approval?: boolean
  approval_status?: ApprovalStatus
  approved_by?: string
  approved_by_name?: string
  approval_timestamp?: string
}

interface ChainOfCustodyProps {
  evidenceId: string
  evidenceNumber: string
  custodyEntries: CustodyEntry[]
  availableUsers: Array<{ id: string; full_name: string }>
  currentUser: { id: string; full_name: string }
  onAddEntry: (entry: Omit<CustodyEntry, 'id' | 'timestamp' | 'performed_by' | 'performed_by_name' | 'evidence_id'>) => Promise<void>
  onApprove: (entryId: string) => Promise<void>
  onReject: (entryId: string) => Promise<void>
  onGenerateReceipt: (entryId: string) => Promise<string>
}

export function ChainOfCustody({
  evidenceId,
  evidenceNumber,
  custodyEntries,
  availableUsers,
  currentUser,
  onAddEntry,
  onApprove,
  onReject,
  onGenerateReceipt,
}: ChainOfCustodyProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterAction, setFilterAction] = useState<CustodyAction | 'ALL'>('ALL')
  const [formData, setFormData] = useState<Omit<CustodyEntry, 'id' | 'timestamp' | 'performed_by' | 'performed_by_name' | 'evidence_id'>>({
    action: 'TRANSFERRED',
    from_person: '',
    from_person_name: '',
    to_person: '',
    to_person_name: '',
    location: '',
    purpose: '',
    notes: '',
    signature_path: '',
    signature_verified: false,
    requires_approval: false,
    approval_status: undefined,
  })

  const handleOpenModal = () => {
    setFormData({
      action: 'TRANSFERRED',
      from_person: '',
      from_person_name: '',
      to_person: '',
      to_person_name: '',
      location: '',
      purpose: '',
      notes: '',
      signature_path: '',
      signature_verified: false,
      requires_approval: false,
      approval_status: undefined,
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if action requires four-eyes approval
    const sensitiveActions: CustodyAction[] = ['DISPOSED', 'RETURNED']
    const requiresApproval = sensitiveActions.includes(formData.action)

    try {
      await onAddEntry({
        ...formData,
        requires_approval: requiresApproval,
        approval_status: requiresApproval ? 'PENDING' : undefined,
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error adding custody entry:', error)
      alert('Failed to add chain of custody entry')
    }
  }

  const handleApprove = async (entryId: string) => {
    if (confirm('Are you sure you want to approve this custody action?')) {
      try {
        await onApprove(entryId)
      } catch (error) {
        console.error('Error approving entry:', error)
        alert('Failed to approve custody entry')
      }
    }
  }

  const handleReject = async (entryId: string) => {
    if (confirm('Are you sure you want to reject this custody action? This action cannot be undone.')) {
      try {
        await onReject(entryId)
      } catch (error) {
        console.error('Error rejecting entry:', error)
        alert('Failed to reject custody entry')
      }
    }
  }

  const handleGenerateReceipt = async (entryId: string) => {
    try {
      const receiptUrl = await onGenerateReceipt(entryId)
      // Open receipt in new window
      window.open(receiptUrl, '_blank')
    } catch (error) {
      console.error('Error generating receipt:', error)
      alert('Failed to generate custody receipt')
    }
  }

  const getActionBadge = (action: CustodyAction) => {
    const variants = {
      COLLECTED: { variant: 'success' as const, label: 'Collected', icon: '📥', color: 'bg-green-100 border-green-200' },
      SEIZED: { variant: 'critical' as const, label: 'Seized', icon: '🚨', color: 'bg-red-100 border-red-200' },
      TRANSFERRED: { variant: 'info' as const, label: 'Transferred', icon: '🔄', color: 'bg-blue-100 border-blue-200' },
      ANALYZED: { variant: 'default' as const, label: 'Analyzed', icon: '🔬', color: 'bg-purple-100 border-purple-200' },
      PRESENTED_COURT: { variant: 'warning' as const, label: 'Presented in Court', icon: '⚖️', color: 'bg-yellow-100 border-yellow-200' },
      RETURNED: { variant: 'default' as const, label: 'Returned', icon: '↩️', color: 'bg-gray-100 border-gray-200' },
      DISPOSED: { variant: 'critical' as const, label: 'Disposed', icon: '🗑️', color: 'bg-red-100 border-red-200' },
    }
    return variants[action]
  }

  const getApprovalBadge = (status: ApprovalStatus) => {
    const variants = {
      PENDING: { variant: 'warning' as const, label: 'Pending Approval', color: 'text-orange-600' },
      APPROVED: { variant: 'success' as const, label: 'Approved', color: 'text-green-600' },
      REJECTED: { variant: 'critical' as const, label: 'Rejected', color: 'text-red-600' },
    }
    return variants[status]
  }

  const filteredEntries = custodyEntries.filter((entry) => filterAction === 'ALL' || entry.action === filterAction)

  // Sort by timestamp (most recent first)
  const sortedEntries = [...filteredEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const pendingApprovals = custodyEntries.filter((entry) => entry.approval_status === 'PENDING')

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filter */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as CustodyAction | 'ALL')}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            >
              <option value="ALL">All Actions ({custodyEntries.length})</option>
              <option value="COLLECTED">Collected</option>
              <option value="SEIZED">Seized</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="ANALYZED">Analyzed</option>
              <option value="PRESENTED_COURT">Presented in Court</option>
              <option value="RETURNED">Returned</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>
          {pendingApprovals.length > 0 && (
            <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              ⚠️ {pendingApprovals.length} {pendingApprovals.length === 1 ? 'entry' : 'entries'} pending approval
            </div>
          )}
        </div>
        <Button onClick={handleOpenModal} className="bg-black text-white hover:bg-neutral-800">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custody Entry
        </Button>
      </div>

      {/* Custody Timeline */}
      <div className="relative">
        {sortedEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-neutral-500">
              No chain of custody entries recorded yet. Click "Add Custody Entry" to start tracking.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200"></div>

            {sortedEntries.map((entry, index) => {
              const actionInfo = getActionBadge(entry.action)
              const showApprovalActions = entry.requires_approval && 
                                           entry.approval_status === 'PENDING' && 
                                           entry.performed_by !== currentUser.id

              return (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-xl ${actionInfo.color}`}>
                    {actionInfo.icon}
                  </div>

                  {/* Entry card */}
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-neutral-900">{actionInfo.label}</h3>
                            <Badge {...actionInfo}>{actionInfo.label}</Badge>
                            {entry.requires_approval && entry.approval_status && (
                              <Badge {...getApprovalBadge(entry.approval_status)}>
                                {getApprovalBadge(entry.approval_status).label}
                              </Badge>
                            )}
                            {entry.signature_verified && (
                              <Badge variant="success" className="text-xs">✓ Verified</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {entry.from_person_name && (
                              <div>
                                <span className="text-neutral-500">From:</span>{' '}
                                <span className="text-neutral-900">{entry.from_person_name}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-neutral-500">To:</span>{' '}
                              <span className="text-neutral-900">{entry.to_person_name}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500">Location:</span>{' '}
                              <span className="text-neutral-900">{entry.location}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500">Date:</span>{' '}
                              <span className="text-neutral-900">{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="mt-3 text-sm">
                            <div className="mb-2">
                              <span className="text-neutral-500 font-medium">Purpose:</span>{' '}
                              <span className="text-neutral-900">{entry.purpose}</span>
                            </div>
                            {entry.notes && (
                              <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                                <span className="text-neutral-500 font-medium text-xs">Notes:</span>
                                <p className="text-neutral-700 text-xs mt-1">{entry.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Recorded by {entry.performed_by_name}
                          </div>

                          {entry.approval_status === 'APPROVED' && entry.approved_by_name && (
                            <div className="mt-2 text-xs text-green-600 flex items-center gap-2">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Approved by {entry.approved_by_name} on {new Date(entry.approval_timestamp!).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4 min-w-[140px]">
                          <button
                            onClick={() => handleGenerateReceipt(entry.id)}
                            className="px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Receipt
                          </button>
                          {showApprovalActions && (
                            <>
                              <button
                                onClick={() => handleApprove(entry.id)}
                                className="px-3 py-2 bg-white hover:bg-green-50 text-green-700 border border-green-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(entry.id)}
                                className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Custody Entry Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Add Custody Entry</h2>
                <p className="text-slate-600 mt-1">
                  Evidence: <strong>{evidenceNumber}</strong>
                </p>
                {['DISPOSED', 'RETURNED'].includes(formData.action) && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                    ⚠️ This action requires four-eyes approval before execution
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Action Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Custody Action <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as CustodyAction })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="COLLECTED">📥 Collected</option>
                    <option value="SEIZED">🚨 Seized</option>
                    <option value="TRANSFERRED">🔄 Transferred</option>
                    <option value="ANALYZED">🔬 Analyzed</option>
                    <option value="PRESENTED_COURT">⚖️ Presented in Court</option>
                    <option value="RETURNED">↩️ Returned</option>
                    <option value="DISPOSED">🗑️ Disposed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* From Person */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      From Person
                    </label>
                    <select
                      value={formData.from_person}
                      onChange={(e) => {
                        const userId = e.target.value
                        const user = availableUsers.find((u) => u.id === userId)
                        setFormData({
                          ...formData,
                          from_person: userId,
                          from_person_name: user?.full_name,
                        })
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">N/A (Initial collection)</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Person */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      To Person <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.to_person}
                      onChange={(e) => {
                        const userId = e.target.value
                        const user = availableUsers.find((u) => u.id === userId)
                        setFormData({
                          ...formData,
                          to_person: userId,
                          to_person_name: user?.full_name,
                        })
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select recipient</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., Evidence Room A - JCTC Headquarters"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., Transfer to forensics lab for analysis"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Additional details, seal integrity verification, etc."
                  />
                </div>

                {/* Signature Verification */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="signature-verified"
                    checked={formData.signature_verified}
                    onChange={(e) => setFormData({ ...formData, signature_verified: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="signature-verified" className="text-sm font-semibold text-slate-700">
                    Signature verified (both parties signed custody form)
                  </label>
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800">
                  {['DISPOSED', 'RETURNED'].includes(formData.action) ? 'Submit for Approval' : 'Add Entry'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
