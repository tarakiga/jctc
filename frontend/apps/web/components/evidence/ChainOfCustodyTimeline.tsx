'use client'

import { useState } from 'react'
import { Button } from '@jctc/ui'
import { ChainOfCustodyEntry } from '@/lib/services/evidence'
import {
  Calendar,
  MoreVertical,
  FileText,
  Check,
  X,
  User,
  MapPin,
  Clock
} from 'lucide-react'

interface ChainOfCustodyTimelineProps {
  entries: ChainOfCustodyEntry[]
  currentUserId: string
  onApprove: (entryId: string) => Promise<void>
  onReject: (entryId: string, reason?: string) => Promise<void>
  onGenerateReceipt: (entryId: string) => Promise<string>
  loading?: boolean
}

interface ApprovalModalProps {
  opened: boolean
  onClose: () => void
  entryId: string
  onApprove: (entryId: string) => Promise<void>
  onReject: (entryId: string, reason?: string) => Promise<void>
  loading?: boolean
}

function ApprovalModal({ opened, onClose, entryId, onApprove, onReject, loading }: ApprovalModalProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await onApprove(entryId)
      onClose()
    } catch (error) {
      alert('Failed to approve entry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setSubmitting(true)
    try {
      await onReject(entryId, rejectReason)
      onClose()
    } catch (error) {
      alert('Failed to reject entry')
    } finally {
      setSubmitting(false)
    }
  }

  if (!opened) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
        {(submitting || loading) && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        )}

        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Approve/Reject Custody Entry</h3>
          <p className="text-sm text-slate-600 mb-4">This custody entry requires your approval. Please review the details carefully.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rejection Reason (Required for rejection)
            </label>
            <textarea
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.currentTarget.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={submitting}
            >
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={submitting}
            >
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CustodyEntryCard({
  entry,
  currentUserId,
  onApprove,
  onReject,
  onGenerateReceipt,
  loading
}: {
  entry: ChainOfCustodyEntry
  currentUserId: string
  onApprove: (entryId: string) => Promise<void>
  onReject: (entryId: string, reason?: string) => Promise<void>
  onGenerateReceipt: (entryId: string) => Promise<string>
  loading?: boolean
}) {
  const [approvalModalOpened, setApprovalModalOpened] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Action badge colors
  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'SEIZED': 'bg-blue-100 text-blue-800',
      'TRANSFERRED': 'bg-green-100 text-green-800',
      'ANALYZED': 'bg-purple-100 text-purple-800',
      'PRESENTED_COURT': 'bg-orange-100 text-orange-800',
      'RETURNED': 'bg-yellow-100 text-yellow-800',
      'DISPOSED': 'bg-red-100 text-red-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  // Approval status badge colors
  const getApprovalColor = (status?: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800'
    }
    return colors[status || ''] || 'bg-gray-100 text-gray-800'
  }

  const handleGenerateReceipt = async () => {
    try {
      await onGenerateReceipt(entry.id)
      alert('Custody transfer receipt has been generated')
    } catch (error) {
      alert('Failed to generate receipt')
    }
  }

  const canApprove = entry.requires_approval &&
    entry.approval_status === 'PENDING' &&
    entry.created_by !== currentUserId

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-4 relative shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getActionColor(entry.action)}`}>
                {entry.action.replace('_', ' ')}
              </span>
              {entry.requires_approval && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getApprovalColor(entry.approval_status)}`}>
                  {entry.approval_status}
                </span>
              )}
            </div>

            <div className="flex items-center text-xs text-slate-500">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(entry.performed_at).toLocaleString()}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-20 py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                    onClick={() => {
                      handleGenerateReceipt();
                      setMenuOpen(false);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Receipt
                  </button>

                  {canApprove && (
                    <>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center"
                        onClick={() => {
                          setApprovalModalOpened(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve Entry
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                        onClick={() => {
                          setApprovalModalOpened(true);
                          setMenuOpen(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Entry
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <User className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-slate-600 mr-1">From:</span>
            <span className="font-medium text-slate-900">{entry.custodian_from || entry.performed_by || 'Unknown'}</span>
          </div>

          {entry.custodian_to && (
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-slate-600 mr-1">To:</span>
              <span className="font-medium text-slate-900">{entry.custodian_to}</span>
            </div>
          )}

          <div className="flex items-center text-sm">
            <MapPin className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-slate-600 mr-1">Location:</span>
            <span className="font-medium text-slate-900">{entry.location_from || entry.location || 'Unknown'}</span>
          </div>

          {entry.location_to && (
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-slate-600 mr-1">To Location:</span>
              <span className="font-medium text-slate-900">{entry.location_to}</span>
            </div>
          )}

          {entry.purpose && (
            <div className="text-sm mt-2 pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-700">Purpose:</span>
              <span className="text-slate-600 ml-1 break-words whitespace-pre-wrap">{entry.purpose}</span>
            </div>
          )}

          {entry.notes && (
            <div className="text-sm">
              <span className="font-medium text-slate-700">Notes:</span>
              <span className="text-slate-600 ml-1 break-words whitespace-pre-wrap">{entry.notes}</span>
            </div>
          )}

          {entry.signature_verified && (
            <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
              <Check className="w-3 h-3 mr-1" />
              Signature Verified
            </div>
          )}

          {entry.approved_by && (
            <div className="text-xs text-slate-400 mt-2 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              Approved by {entry.approved_by} on {new Date(entry.approval_timestamp || '').toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <ApprovalModal
        opened={approvalModalOpened}
        onClose={() => setApprovalModalOpened(false)}
        entryId={entry.id}
        onApprove={onApprove}
        onReject={onReject}
        loading={loading}
      />
    </>
  )
}

export function ChainOfCustodyTimeline({
  entries,
  currentUserId,
  onApprove,
  onReject,
  onGenerateReceipt,
  loading
}: ChainOfCustodyTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
        <p className="text-slate-500 font-medium">
          No chain of custody entries found for this evidence.
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Use the form above to add the first custody entry.
        </p>
      </div>
    )
  }

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
  )

  // Group entries by date
  const entriesByDate = sortedEntries.reduce((groups, entry) => {
    const date = new Date(entry.performed_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as Record<string, ChainOfCustodyEntry[]>)

  return (
    <div className="space-y-8">
      {Object.entries(entriesByDate).map(([date, dateEntries]) => (
        <div key={date} className="relative">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 py-2 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-500 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
          </div>

          <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-2">
            {dateEntries.map((entry) => (
              <div key={entry.id} className="relative">
                <div className="absolute -left-[21px] top-4 w-3 h-3 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                <CustodyEntryCard
                  entry={entry}
                  currentUserId={currentUserId}
                  onApprove={onApprove}
                  onReject={onReject}
                  onGenerateReceipt={onGenerateReceipt}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}