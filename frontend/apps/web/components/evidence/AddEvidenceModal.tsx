'use client'

import { useState } from 'react'
import { Button } from '@jctc/ui'
import { X, CheckCircle, Upload, AlertCircle } from 'lucide-react'
import { useCases } from '@/lib/hooks/useCases'

interface AddEvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedCaseId?: string
}

export function AddEvidenceModal({ isOpen, onClose, preSelectedCaseId }: AddEvidenceModalProps) {
  const { cases, loading: casesLoading } = useCases()
  const [selectedCaseId, setSelectedCaseId] = useState(preSelectedCaseId || '')
  const [formData, setFormData] = useState({
    type: 'DIGITAL',
    description: '',
    collectedBy: '',
    storageLocation: '',
    notes: ''
  })
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCaseId) {
      setError('Please select a case')
      return
    }

    setSubmitting(true)
    setError('')
    
    try {
      // TODO: Implement actual API call when backend endpoint is ready
      // const result = await evidenceService.createEvidence({
      //   case_id: selectedCaseId,
      //   ...formData
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add evidence')
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedCaseId(preSelectedCaseId || '')
      setFormData({
        type: 'DIGITAL',
        description: '',
        collectedBy: '',
        storageLocation: '',
        notes: ''
      })
      setFiles([])
      setSuccess(false)
      setError('')
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 animate-in fade-in zoom-in duration-300">
          {!success ? (
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Add Evidence</h2>
                    <p className="text-slate-600 mt-1">Add new evidence to a case</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Case Selection */}
                {!preSelectedCaseId && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Case <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      disabled={submitting || casesLoading}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Choose a case...</option>
                      {cases.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Evidence Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Evidence Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={submitting}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:opacity-50"
                  >
                    <option value="DIGITAL">Digital Evidence</option>
                    <option value="PHYSICAL">Physical Evidence</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="TESTIMONIAL">Testimonial</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                    required
                    rows={3}
                    placeholder="Describe the evidence..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Collected By */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Collected By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.collectedBy}
                      onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                      disabled={submitting}
                      required
                      placeholder="Officer name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>

                  {/* Storage Location */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={formData.storageLocation}
                      onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                      disabled={submitting}
                      placeholder="Evidence locker #"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Attach Files
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      disabled={submitting}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">
                        Click to browse or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">
                        Images, documents, videos • Max 100MB per file
                      </p>
                    </label>
                    {files.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          {files.length} file{files.length > 1 ? 's' : ''} selected:
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {files.map((file, i) => (
                            <li key={i}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={submitting}
                    rows={3}
                    placeholder="Any additional information..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={submitting || !selectedCaseId}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Evidence...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Add Evidence
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="px-8 py-16 text-center">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Evidence Added!</h3>
              <p className="text-slate-600 mb-6">
                The evidence has been successfully added to the case.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
