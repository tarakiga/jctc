'use client'

import { useState, useEffect } from 'react'
import { Button } from '@jctc/ui'
import { TeamActivityType, TeamActivity } from '@jctc/types'
import { format } from 'date-fns'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

interface TeamActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    activity_type: TeamActivityType
    title: string
    description?: string
    start_time: string
    end_time: string
  }) => void
  initialData?: TeamActivity
  mode: 'create' | 'edit'
  isLoading?: boolean
}

export function TeamActivityModal({ isOpen, onClose, onSubmit,
  initialData,
  mode,
  isLoading = false
}: TeamActivityModalProps) {
  const [formData, setFormData] = useState({
    activity_type: TeamActivityType.MEETING,
    title: '',
    description: '',
    start_time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    end_time: format(new Date(Date.now() + 60 * 60 * 1000), 'yyyy-MM-dd\'T\'HH:mm')
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        activity_type: initialData.activity_type,
        title: initialData.title,
        description: initialData.description || '',
        start_time: format(new Date(initialData.start_time), 'yyyy-MM-dd\'T\'HH:mm'),
        end_time: format(new Date(initialData.end_time), 'yyyy-MM-dd\'T\'HH:mm')
      })
    } else {
      setFormData({
        activity_type: TeamActivityType.MEETING,
        title: '',
        description: '',
        start_time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        end_time: format(new Date(Date.now() + 60 * 60 * 1000), 'yyyy-MM-dd\'T\'HH:mm')
      })
    }
  }, [initialData, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Create Team Activity' : 'Edit Team Activity'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type
                </label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as TeamActivityType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={TeamActivityType.MEETING}>Meeting</option>
                  <option value={TeamActivityType.TRAVEL}>Travel</option>
                  <option value={TeamActivityType.TRAINING}>Training</option>
                  <option value={TeamActivityType.LEAVE}>Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter activity title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter activity description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DateTimePicker
                  label="Start Time"
                  value={formData.start_time}
                  onChange={(value) => setFormData({ ...formData, start_time: value })}
                  required
                  placeholder="Select start time"
                />

                <DateTimePicker
                  label="End Time"
                  value={formData.end_time}
                  onChange={(value) => setFormData({ ...formData, end_time: value })}
                  required
                  placeholder="Select end time"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    mode === 'create' ? 'Create' : 'Update'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}