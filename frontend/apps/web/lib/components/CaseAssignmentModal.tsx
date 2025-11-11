'use client'

import { useState } from 'react'
import { Button, Badge } from '@jctc/ui'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  available: boolean
}

interface CaseAssignmentModalProps {
  caseId: string
  currentAssignee?: string
  onAssign: (userId: string) => Promise<void>
  onClose: () => void
}

export function CaseAssignmentModal({
  caseId,
  currentAssignee,
  onAssign,
  onClose,
}: CaseAssignmentModalProps) {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Mock team members - in real app, fetch from API
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@jctc.gov',
      role: 'Investigator',
      available: true,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@jctc.gov',
      role: 'Forensic Analyst',
      available: true,
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@jctc.gov',
      role: 'Prosecutor',
      available: false,
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah.williams@jctc.gov',
      role: 'Supervisor',
      available: true,
    },
  ]

  const handleAssign = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      await onAssign(selectedUser)
      onClose()
    } catch (error) {
      console.error('Failed to assign case:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Assign Case</h3>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-6">
              Select a team member to assign this case to
            </p>

            {/* Team Members List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser === member.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  } ${!member.available ? 'opacity-50' : ''}`}
                  onClick={() => member.available && setSelectedUser(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center">
                      <span className="text-neutral-700 font-semibold text-sm">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{member.name}</p>
                      <p className="text-sm text-neutral-600">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{member.role}</Badge>
                    {!member.available && <Badge variant="warning">Unavailable</Badge>}
                    {currentAssignee === member.id && <Badge variant="success">Current</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={!selectedUser || loading}
            >
              {loading ? 'Assigning...' : 'Assign Case'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
