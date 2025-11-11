'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'

type AssignmentRole = 'LEAD' | 'SUPPORT' | 'PROSECUTOR' | 'LIAISON'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  org_unit?: string
}

interface Assignment {
  id: string
  user_id: string
  user: User
  role: AssignmentRole
  assigned_at: string
}

interface AssignmentManagerProps {
  caseId: string
  assignments: Assignment[]
  availableUsers: User[]
  onAssign: (userId: string, role: AssignmentRole) => Promise<void>
  onUnassign: (assignmentId: string) => Promise<void>
}

export function AssignmentManager({
  caseId,
  assignments,
  availableUsers,
  onAssign,
  onUnassign,
}: AssignmentManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>('SUPPORT')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenModal = () => {
    setSelectedUserId('')
    setSelectedRole('SUPPORT')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId) {
      alert('Please select a user')
      return
    }

    // Prevent duplicates only per role (allow multiple roles per user)
    const hasRoleAlready = assignments.some(
      (a) => a.user_id === selectedUserId && a.role === selectedRole
    )
    if (hasRoleAlready) {
      alert('This user already has this role in the case')
      return
    }

    setIsSubmitting(true)
    try {
      await onAssign(selectedUserId, selectedRole)
      handleCloseModal()
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user to case')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnassign = async (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      try {
        await onUnassign(assignmentId)
      } catch (error) {
        console.error('Error removing assignment:', error)
        alert('Failed to remove assignment')
      }
    }
  }

  const getRoleBadge = (role: AssignmentRole) => {
    const variants = {
      LEAD: 'critical' as const,
      SUPPORT: 'default' as const,
      PROSECUTOR: 'warning' as const,
      LIAISON: 'info' as const,
    }
    return <Badge variant={variants[role]}>{role}</Badge>
  }

  const groupedAssignments = {
    LEAD: assignments.filter((a) => a.role === 'LEAD'),
    SUPPORT: assignments.filter((a) => a.role === 'SUPPORT'),
    PROSECUTOR: assignments.filter((a) => a.role === 'PROSECUTOR'),
    LIAISON: assignments.filter((a) => a.role === 'LIAISON'),
  }

  const selectableUsers = availableUsers
  const assignedRolesForSelectedUser = assignments
    .filter((a) => a.user_id === selectedUserId)
    .map((a) => a.role)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Case Assignments</h3>
        <Button onClick={handleOpenModal} className="bg-black text-white hover:bg-neutral-800">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Assign User
        </Button>
      </div>

      {/* Assignments by Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead Investigator */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <h4 className="font-semibold text-slate-900">Lead Investigator</h4>
              </div>
              <Badge variant="critical">LEAD</Badge>
            </div>
            {groupedAssignments.LEAD.length === 0 ? (
              <p className="text-sm text-neutral-500">No lead investigator assigned</p>
            ) : (
              <div className="space-y-2">
                {groupedAssignments.LEAD.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{assignment.user.full_name}</p>
                      <p className="text-sm text-slate-600">{assignment.user.email}</p>
                      {assignment.user.org_unit && (
                        <p className="text-xs text-slate-500 mt-1">{assignment.user.org_unit}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Team */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h4 className="font-semibold text-slate-900">Support Team</h4>
              </div>
              <Badge variant="default">SUPPORT</Badge>
            </div>
            {groupedAssignments.SUPPORT.length === 0 ? (
              <p className="text-sm text-neutral-500">No support team members</p>
            ) : (
              <div className="space-y-2">
                {groupedAssignments.SUPPORT.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{assignment.user.full_name}</p>
                      <p className="text-sm text-slate-600">{assignment.user.email}</p>
                      {assignment.user.org_unit && (
                        <p className="text-xs text-slate-500 mt-1">{assignment.user.org_unit}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prosecutor */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                  />
                </svg>
                <h4 className="font-semibold text-slate-900">Prosecutor</h4>
              </div>
              <Badge variant="warning">PROSECUTOR</Badge>
            </div>
            {groupedAssignments.PROSECUTOR.length === 0 ? (
              <p className="text-sm text-neutral-500">No prosecutor assigned</p>
            ) : (
              <div className="space-y-2">
                {groupedAssignments.PROSECUTOR.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-3 bg-amber-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{assignment.user.full_name}</p>
                      <p className="text-sm text-slate-600">{assignment.user.email}</p>
                      {assignment.user.org_unit && (
                        <p className="text-xs text-slate-500 mt-1">{assignment.user.org_unit}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liaison */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h4 className="font-semibold text-slate-900">Liaison Officer</h4>
              </div>
              <Badge variant="info">LIAISON</Badge>
            </div>
            {groupedAssignments.LIAISON.length === 0 ? (
              <p className="text-sm text-neutral-500">No liaison officer assigned</p>
            ) : (
              <div className="space-y-2">
                {groupedAssignments.LIAISON.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-3 bg-indigo-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{assignment.user.full_name}</p>
                      <p className="text-sm text-slate-600">{assignment.user.email}</p>
                      {assignment.user.org_unit && (
                        <p className="text-xs text-slate-500 mt-1">{assignment.user.org_unit}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Assign User to Case</h2>
                <p className="text-slate-600 mt-1">Select a user and their role in this case</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select a user...</option>
                    {selectableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} - {user.role} {user.org_unit && `(${user.org_unit})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-2">
                    Users can hold multiple roles in a case; duplicates are prevented per role.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Assignment Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['LEAD', 'SUPPORT', 'PROSECUTOR', 'LIAISON'] as AssignmentRole[]).map(
                      (role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          disabled={assignedRolesForSelectedUser.includes(role)}
                          className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                            selectedRole === role
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          } ${assignedRolesForSelectedUser.includes(role) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {role}
                        </button>
                      )
                    )}
                  </div>
                  <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      {selectedRole === 'LEAD' &&
                        '🌟 Lead investigator has full access and oversight of the case'}
                      {selectedRole === 'SUPPORT' &&
                        '👥 Support team members assist with investigation tasks'}
                      {selectedRole === 'PROSECUTOR' &&
                        '⚖️ Prosecutors handle legal proceedings and court matters'}
                      {selectedRole === 'LIAISON' &&
                        '🌍 Liaison officers coordinate international and inter-agency cooperation'}
                    </p>
                  </div>
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!selectedUserId || isSubmitting}
                  className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign User'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
