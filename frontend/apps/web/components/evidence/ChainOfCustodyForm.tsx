'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@jctc/ui'
import { useLookup, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'

// Validation schema matching backend requirements
const custodyFormSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  custodian_from: z.string().optional(),
  custodian_to: z.string().optional(),
  location_from: z.string().optional(),
  location_to: z.string().optional(),

  notes: z.string().min(1, 'Reason/Notes are required'),
  signature_verified: z.boolean(),
  requires_approval: z.boolean()
})

export type CustodyFormData = z.infer<typeof custodyFormSchema>

interface ChainOfCustodyFormProps {
  opened: boolean
  onClose: () => void
  evidenceId: string
  evidenceNumber: string
  currentCustodian?: string
  currentLocation?: string
  availableUsers: Array<{ id: string; name: string; role: string }>
  onSubmit: (data: CustodyFormData) => Promise<void>
  loading?: boolean
}

export function ChainOfCustodyForm({
  opened,
  onClose,
  evidenceId,
  evidenceNumber,
  currentCustodian,
  currentLocation,
  availableUsers,
  onSubmit,
  loading = false
}: ChainOfCustodyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<CustodyFormData>({
    resolver: zodResolver(custodyFormSchema),
    defaultValues: {
      action: 'SEIZED',
      custodian_from: currentCustodian || '',
      custodian_to: '',
      location_from: currentLocation || '',
      location_to: '',

      notes: '',
      signature_verified: false,
      requires_approval: false
    }
  })

  const action = watch('action')

  // User options for select dropdowns
  const userOptions = availableUsers.map(user => ({
    value: user.id,
    label: `${user.name} (${user.role})`
  }))

  // Fetch dynamic action options from lookup_values
  const { values: actionLookups, loading: actionLoading } = useLookup(LOOKUP_CATEGORIES.CUSTODY_ACTION)

  // Action options with descriptions (from lookup)
  const actionOptions = actionLookups.map(lookup => ({
    value: lookup.value,
    label: lookup.label,
    description: `Action: ${lookup.label}`
  }))

  // Check if action requires approval
  const requiresApproval = (action: string) => {
    return ['DISPOSED', 'RETURNED', 'PRESENTED_COURT'].includes(action)
  }

  const onFormSubmit = async (data: CustodyFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting custody entry:', error)
      alert('Failed to submit custody entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsApproval = requiresApproval(action || '')

  if (!opened) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
          <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
              disabled={isSubmitting || loading}
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-slate-900">
              Chain of Custody Entry
            </h2>
            <p className="text-slate-600 mt-1">
              Evidence {evidenceNumber}
            </p>
          </div>

          {(loading || isSubmitting) && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-3xl z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="px-8 py-6 space-y-6">
            {/* Evidence Information */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Evidence Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Evidence ID:</span>
                  <span className="ml-2 font-medium">{evidenceId}</span>
                </div>
                <div>
                  <span className="text-slate-600">Evidence Number:</span>
                  <span className="ml-2 font-medium">{evidenceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-600">Current Custodian:</span>
                  <span className="ml-2 font-medium">{currentCustodian || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Current Location:</span>
                  <span className="ml-2 font-medium">{currentLocation || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custody Action
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register('action')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                required
              >
                <option value="">Choose an action</option>
                {actionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
              {errors.action && (
                <p className="text-red-500 text-sm mt-1">{errors.action.message}</p>
              )}
            </div>

            {/* Approval Warning */}
            {needsApproval && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-amber-800 font-medium">Approval Required</p>
                    <p className="text-amber-700 text-sm">
                      This action requires four-eyes approval from another authorized user before it becomes effective.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Custodian Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Custodian
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  {...register('custodian_from')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  disabled={!currentCustodian}
                  required
                >
                  <option value="">Select custodian</option>
                  {userOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.custodian_from && (
                  <p className="text-red-500 text-sm mt-1">{errors.custodian_from.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Custodian
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  {...register('custodian_to')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  required
                >
                  <option value="">Select custodian</option>
                  {userOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.custodian_to && (
                  <p className="text-red-500 text-sm mt-1">{errors.custodian_to.message}</p>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Location
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  {...register('location_from')}
                  type="text"
                  placeholder="Enter current location"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  required
                />
                {errors.location_from && (
                  <p className="text-red-500 text-sm mt-1">{errors.location_from.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Location
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  {...register('location_to')}
                  type="text"
                  placeholder="Enter new location"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  required
                />
                {errors.location_to && (
                  <p className="text-red-500 text-sm mt-1">{errors.location_to.message}</p>
                )}
              </div>
            </div>



            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason / Notes
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                {...register('notes')}
                placeholder="Enter reason for custody action..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                required
              />
              {errors.notes && (
                <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
              )}
            </div>



            {/* Signature Verification */}
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('signature_verified')}
                className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-slate-700">
                Signature verified
              </label>
              <div className="text-xs text-slate-500 ml-1">(Confirm that signatures have been verified)</div>
            </div>

            {/* Hidden field for approval requirement */}
            <input type="hidden" {...register('requires_approval')} value={needsApproval ? 'true' : 'false'} />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSubmitting ? 'Submitting...' : (needsApproval ? 'Submit for Approval' : 'Add Entry')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}