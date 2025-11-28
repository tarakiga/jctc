'use client'

import { useState } from 'react'
import { Button } from '@jctc/ui'

// Delete Confirmation Modal
interface DeleteTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  taskTitle: string
}

export function DeleteTaskModal({ isOpen, onClose, onConfirm, taskTitle }: DeleteTaskModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Delete Task?</h2>
            <p className="text-slate-600 text-center mb-1">
              Are you sure you want to delete:
            </p>
            <p className="text-slate-900 font-semibold text-center mb-4">{taskTitle}</p>

            {/* Warning Banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">This action is irreversible</p>
                  <p className="text-sm text-red-700">
                    All task details, assignments, and history will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Start Task Modal
interface StartTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  taskTitle: string
}

export function StartTaskModal({ isOpen, onClose, onConfirm, taskTitle }: StartTaskModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Start Task?</h2>
            <p className="text-slate-600 text-center mb-1">
              Mark this task as in progress:
            </p>
            <p className="text-slate-900 font-semibold text-center mb-6">{taskTitle}</p>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-900">
                ⏱️ This will move the task to <strong>In Progress</strong> status and notify the assigned team members.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
              >
                Start Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Complete Task Modal
interface CompleteTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  taskTitle: string
}

export function CompleteTaskModal({ isOpen, onClose, onConfirm, taskTitle }: CompleteTaskModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Complete Task?</h2>
            <p className="text-slate-600 text-center mb-1">
              Mark this task as completed:
            </p>
            <p className="text-slate-900 font-semibold text-center mb-6">{taskTitle}</p>

            {/* Info Box */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-900">
                ✅ This will mark the task as <strong>Done</strong> and notify relevant team members. You can reopen it later if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25"
              >
                Complete Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Block Task Modal
interface BlockTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  taskTitle: string
}

export function BlockTaskModal({ isOpen, onClose, onConfirm, taskTitle }: BlockTaskModalProps) {
  const [blockReason, setBlockReason] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!blockReason.trim()) {
      alert('Please provide a reason for blocking this task')
      return
    }
    onConfirm(blockReason)
    setBlockReason('')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Block Task?</h2>
            <p className="text-slate-600 text-center mb-1">
              Block progress on:
            </p>
            <p className="text-slate-900 font-semibold text-center mb-6">{taskTitle}</p>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Blocking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                placeholder="e.g., Waiting for evidence approval, Missing required information..."
              />
            </div>

            {/* Warning Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-900">
                🚫 This will mark the task as <strong>Blocked</strong> and alert team members about the impediment.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-lg shadow-orange-500/25"
              >
                Block Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
