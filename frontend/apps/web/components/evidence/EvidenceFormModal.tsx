'use client'

import { useState, useEffect } from 'react'
import { Button } from '@jctc/ui'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { useUsers } from '@/lib/hooks/useUsers'
import { useSeizures } from '@/lib/hooks/useSeizures'

type EvidenceCategory = string
type RetentionPolicy = string

interface EvidenceFormData {
  label: string
  category: EvidenceCategory
  evidence_type: string
  description: string
  storage_location: string
  sha256_hash?: string
  files?: File[]
  file_path?: string
  file_size?: number
  retention_policy: RetentionPolicy
  collected_at: string
  collected_by?: string
  notes: string
  seizure_id?: string  // Optional - link evidence to a specific seizure
}

interface EvidenceItem extends EvidenceFormData {
  id: string
  evidence_number: string
  collected_by: string
  collected_by_name: string
}

interface EvidenceFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (evidence: EvidenceFormData) => Promise<void>
  editingEvidence?: EvidenceItem | null
  caseId: string  // Required to fetch seizures for this case
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Classification', description: 'Evidence type and category' },
  { id: 2, title: 'Details', description: 'Description and identification' },
  { id: 3, title: 'Custody', description: 'Storage and collection info' },
]

const TOTAL_STEPS = STEPS.length

export function EvidenceFormModal({ isOpen, onClose, onSubmit, editingEvidence, caseId }: EvidenceFormModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<EvidenceFormData>({
    label: '',
    category: 'DIGITAL',
    evidence_type: '',
    description: '',
    storage_location: '',
    sha256_hash: '',
    file_path: '',
    file_size: undefined,
    retention_policy: 'CASE_CLOSE_PLUS_7',
    collected_at: new Date().toISOString().slice(0, 16),
    collected_by: '',
    notes: '',
    files: [],
    seizure_id: '',  // Empty string means no seizure selected
  })

  const {
    [LOOKUP_CATEGORIES.EVIDENCE_CATEGORY]: categoryLookup,
    [LOOKUP_CATEGORIES.RETENTION_POLICY]: retentionLookup,
    [LOOKUP_CATEGORIES.STORAGE_LOCATION]: storageLocationLookup,
    [LOOKUP_CATEGORIES.DEVICE_TYPE]: deviceTypeLookup
  } = useLookups([
    LOOKUP_CATEGORIES.EVIDENCE_CATEGORY,
    LOOKUP_CATEGORIES.RETENTION_POLICY,
    LOOKUP_CATEGORIES.STORAGE_LOCATION,
    LOOKUP_CATEGORIES.DEVICE_TYPE
  ])

  const { users = [] } = useUsers()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch seizures for the case to populate the optional dropdown
  const { data: seizures = [], isLoading: seizuresLoading } = useSeizures(caseId)

  // Populate form when editing
  useEffect(() => {
    if (editingEvidence) {
      setFormData({
        label: editingEvidence.label,
        category: editingEvidence.category,
        evidence_type: editingEvidence.evidence_type || '',
        description: editingEvidence.description || '',
        storage_location: editingEvidence.storage_location || '',
        sha256_hash: editingEvidence.sha256_hash || '',
        file_path: editingEvidence.file_path || '',
        file_size: editingEvidence.file_size,
        retention_policy: editingEvidence.retention_policy,
        collected_at: editingEvidence.collected_at?.slice(0, 16) || new Date().toISOString().slice(0, 16),
        collected_by: editingEvidence.collected_by || '',
        notes: editingEvidence.notes || '',
      })
      setCurrentStep(1)
    } else {
      // Reset form for adding
      setFormData({
        label: '',
        category: 'DIGITAL',
        evidence_type: '',
        description: '',
        storage_location: '',
        sha256_hash: '',
        file_path: '',
        file_size: undefined,
        retention_policy: 'CASE_CLOSE_PLUS_7',
        collected_at: new Date().toISOString().slice(0, 16),
        collected_by: '',
        notes: '',
      })
      setCurrentStep(1)
    }
  }, [editingEvidence, isOpen])

  const handleSubmit = async () => {
    if (!formData.label || !formData.description || !formData.category) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error saving evidence:', error)
      alert('Failed to save evidence')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1)
  }

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1)
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const canProceedStep1 = formData.label && formData.category
  const canProceedStep2 = formData.description

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
          {/* Modal Header */}
          <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {editingEvidence ? 'Edit Evidence' : 'Add Evidence'}
                </h2>
                <p className="text-slate-600 mt-1">
                  {editingEvidence ? `Editing ${editingEvidence.evidence_number}` : 'Register new evidence item'}
                </p>
              </div>
            </div>

            {/* Progress Steps - Matching Create Case Style */}
            <div className="flex items-center gap-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step.id === currentStep
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                      }`}>
                      {step.id < currentStep ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-semibold uppercase tracking-wide ${step.id === currentStep ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-full mx-2 transition-colors ${step.id < currentStep ? 'bg-green-500' : 'bg-slate-200'
                      }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal Content */}
          <div className="px-8 py-8 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Classification */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Evidence Label */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Evidence Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., Laptop - HP EliteBook 840"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as EvidenceCategory })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select Category</option>
                      {categoryLookup.values.map((v) => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.evidence_type}
                      onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select Type</option>
                      {deviceTypeLookup?.values?.map((v) => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Seizure Link */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Link to Seizure <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.seizure_id || ''}
                    onChange={(e) => setFormData({ ...formData, seizure_id: e.target.value || undefined })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    disabled={seizuresLoading}
                  >
                    <option value="">No seizure - Evidence attached directly to case</option>
                    {seizures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.seized_at).toLocaleDateString()} - {s.location}
                        {s.warrant_number ? ` (${s.warrant_number})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {seizures.length === 0
                      ? 'No seizures recorded for this case yet. Create a seizure log first if needed.'
                      : 'Select a seizure if this evidence was collected during a specific seizure event.'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Evidence Details (merged description + notes) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Evidence Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Describe the evidence: what it is, physical condition, notable features, collection circumstances, handling notes, etc."
                  />
                  <p className="mt-1 text-xs text-slate-500">Include any relevant observations, special handling requirements, or chain of custody notes.</p>
                </div>

                {/* Digital/Document/Testimonial Evidence Fields */}
                {['DIGITAL', 'DOCUMENT', 'TESTIMONIAL'].includes(formData.category) && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">File & Evidence Details</h3>

                    {/* File Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Upload File
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-900">
                          <svg className="w-5 h-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Choose File
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              if (files.length > 0) {
                                setFormData({
                                  ...formData,
                                  files: files,
                                  file_path: files[0].name,
                                  file_size: files[0].size
                                })
                              }
                            }}
                          />
                        </label>
                        {formData.files && formData.files.length > 0 && (
                          <span className="text-sm text-slate-600">
                            {formData.files[0].name} ({formatFileSize(formData.files[0].size || 0)})
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        SHA-256 hash will be automatically calculated upon upload.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          File Path / Name
                        </label>
                        <input
                          type="text"
                          value={formData.file_path || ''}
                          onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="e.g., evidence_image_20250116.dd"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          File Size (bytes)
                        </label>
                        <input
                          type="number"
                          value={formData.file_size || ''}
                          onChange={(e) => setFormData({ ...formData, file_size: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="e.g., 512000000000"
                        />
                        {formData.file_size && (
                          <p className="text-sm text-slate-500 mt-1">≈ {formatFileSize(formData.file_size)}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        SHA-256 Hash
                      </label>
                      <input
                        type="text"
                        value={formData.sha256_hash || ''}
                        onChange={(e) => setFormData({ ...formData, sha256_hash: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono text-sm bg-slate-50"
                        placeholder="Calculated automatically if file uploaded, or enter manually"
                        maxLength={64}
                        readOnly={!!(formData.files && formData.files.length > 0)}
                      />
                      {formData.sha256_hash && formData.sha256_hash.length > 0 && formData.sha256_hash.length !== 64 && (
                        <p className="text-sm text-orange-600 mt-1">⚠️ SHA-256 hash should be exactly 64 characters</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Custody */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Storage Location */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Storage Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.storage_location}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select Location</option>
                      {storageLocationLookup?.values?.map((v) => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Retention Policy */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Retention Policy <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.retention_policy}
                      onChange={(e) => setFormData({ ...formData, retention_policy: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select Policy</option>
                      {retentionLookup.values.map((v) => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collection Date & Time */}
                <div>
                  <DateTimePicker
                    label="Collection Date & Time"
                    value={formData.collected_at}
                    onChange={(value) => setFormData({ ...formData, collected_at: value })}
                    required
                    placeholder="Select collection date and time"
                    maxDate={new Date()}
                  />
                </div>

                {/* Collected By */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Collected By
                  </label>
                  <select
                    value={formData.collected_by || ''}
                    onChange={(e) => setFormData({ ...formData, collected_by: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select officer who collected...</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.role ? `(${user.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-8 py-6 border-t border-slate-200/60 flex justify-between items-center">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={handlePrevStep}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  onClick={handleNextStep}
                  disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingEvidence ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingEvidence ? 'Update Evidence' : 'Add Evidence'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
