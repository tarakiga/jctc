'use client'

import { useState } from 'react'
import { Button, Badge } from '@jctc/ui'

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
  caseId: _caseId,
  assignments,
  availableUsers,
  onAssign,
  onUnassign,
}: AssignmentManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>('SUPPORT')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

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

  const handleOpenEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setSelectedRole(assignment.role)
    setIsEditModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingAssignment(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingAssignment) return

    // If role hasn't changed, just close
    if (selectedRole === editingAssignment.role) {
      handleCloseEditModal()
      return
    }

    setIsSubmitting(true)
    try {
      // Unassign the old assignment and reassign with new role
      await onUnassign(editingAssignment.id)
      await onAssign(editingAssignment.user_id, selectedRole)
      handleCloseEditModal()
    } catch (error) {
      console.error('Error updating assignment:', error)
      alert('Failed to update assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDeleteModal = (assignment: Assignment) => {
    setDeletingAssignment(assignment)
    setIsDeleteModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingAssignment(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return

    try {
      await onUnassign(deletingAssignment.id)
      handleCloseDeleteModal()
    } catch (error) {
      console.error('Error removing assignment:', error)
      alert('Failed to remove assignment')
    }
  }

  const selectableUsers = availableUsers
  const assignedRolesForSelectedUser = assignments
    .filter((a) => a.user_id === selectedUserId)
    .map((a) => a.role)

  const getRoleColor = (role: AssignmentRole) => {
    const colors = {
      LEAD: 'bg-red-100 text-red-700 border-red-200',
      SUPPORT: 'bg-blue-100 text-blue-700 border-blue-200',
      PROSECUTOR: 'bg-amber-100 text-amber-700 border-amber-200',
      LIAISON: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    }
    return colors[role]
  }

  const getRoleIcon = (role: AssignmentRole) => {
    const icons = {
      LEAD: '⭐',
      SUPPORT: '👥',
      PROSECUTOR: '⚖️',
      LIAISON: '🌍',
    }
    return icons[role]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Case Team</h3>
          <p className="text-sm text-slate-600 mt-1">{assignments.length} team member{assignments.length !== 1 ? 's' : ''} assigned</p>
        </div>
        <Button onClick={handleOpenModal} className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
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

      {/* Unified List View */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No team members assigned</h3>
            <p className="text-slate-600 mb-6">Start by assigning users to different roles in this case.</p>
            <Button onClick={handleOpenModal} className="bg-slate-900 text-white hover:bg-slate-800">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign First Member
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <div className="grid grid-cols-12 gap-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <div className="col-span-3">Member</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Contact</div>
              <div className="col-span-2">Assigned</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-200">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="grid grid-cols-12 gap-6 items-center">
                  {/* Member Info */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
                        {assignment.user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{assignment.user.full_name}</p>
                        {assignment.user.org_unit && (
                          <p className="text-xs text-slate-500">{assignment.user.org_unit}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-3">
                    <Badge variant="default" className={`${getRoleColor(assignment.role)} border font-semibold whitespace-nowrap inline-flex items-center gap-1`}>
                      <span>{getRoleIcon(assignment.role)}</span>
                      <span>{assignment.role}</span>
                    </Badge>
                  </div>

                  {/* Contact */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{assignment.user.email}</span>
                    </div>
                  </div>

                  {/* Assigned Date */}
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 text-center relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === assignment.id ? null : assignment.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdownId === assignment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdownId(null)}
                        ></div>
                        <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1">
                          <button
                            onClick={() => handleOpenEditModal(assignment)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Assignment
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(assignment)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove from Case
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {isEditModalOpen && editingAssignment && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            onClick={handleCloseEditModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseEditModal}
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
                <h2 className="text-3xl font-bold text-slate-900">Edit Assignment</h2>
                <p className="text-slate-600 mt-1">Update the user or role for this assignment</p>
              </div>

              <form onSubmit={handleEditSubmit} className="px-8 py-6 space-y-6">
                {/* Current Assignment Info */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Editing Assignment For</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
                      {editingAssignment.user.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{editingAssignment.user.full_name}</p>
                      <p className="text-xs text-slate-600">{editingAssignment.user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Change Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['LEAD', 'SUPPORT', 'PROSECUTOR', 'LIAISON'] as AssignmentRole[]).map(
                      (role) => {
                        const roleIcon = getRoleIcon(role)
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setSelectedRole(role)}
                            className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                              selectedRole === role
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            <span>{roleIcon}</span>
                            <span>{role}</span>
                          </button>
                        )
                      }
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
                <Button variant="outline" type="button" onClick={handleCloseEditModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleEditSubmit}
                  disabled={isSubmitting}
                  className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Role'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingAssignment && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            onClick={handleCloseDeleteModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
              {/* Icon */}
              <div className="flex justify-center pt-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>

              <div className="px-8 pt-6 pb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Remove Assignment?</h2>
                <p className="text-slate-600 mb-4">
                  Are you sure you want to remove <span className="font-semibold text-slate-900">{deletingAssignment.user.full_name}</span> from this case?
                </p>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Warning:</span> This will remove their access and all associated permissions for this case.
                  </p>
                </div>
              </div>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" onClick={handleCloseDeleteModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Remove Assignment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

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
