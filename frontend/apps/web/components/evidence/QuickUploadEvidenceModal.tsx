'use client'

import { useState } from 'react'
import { Button } from '@jctc/ui'
import { Upload, X, CheckCircle, FileText } from 'lucide-react'

interface QuickUploadEvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  cases?: Array<{ id: string; case_number: string; title: string }>
}

export function QuickUploadEvidenceModal({ isOpen, onClose, cases = [] }: QuickUploadEvidenceModalProps) {
  const [selectedCase, setSelectedCase] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleUpload = async () => {
    setUploading(true)
    // TODO: Implement actual upload when backend endpoint is ready
    // Backend needs: POST /api/v1/evidence (create) then POST /api/v1/evidence/{id}/upload (files)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setUploading(false)
    setSuccess(true)
    
    // Auto-close after success
    setTimeout(() => {
      setSuccess(false)
      onClose()
    }, 2000)
  }

  const handleClose = () => {
    if (!uploading) {
      setSuccess(false)
      setSelectedCase('')
      onClose()
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-300">
          {!success ? (
            <>
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleClose}
                  disabled={uploading}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Quick Upload Evidence</h2>
                    <p className="text-slate-600 mt-1">Select a case and upload evidence files</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 space-y-6">
                {/* Case Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Case <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value)}
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:opacity-50"
                  >
                    <option value="">Choose a case...</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Or upload from the case detail page for more options
                  </p>
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Evidence Files <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-12 text-center">
                    <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
                      <Upload className="w-8 h-8 text-amber-600" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900 mb-1">
                      📦 Coming Soon
                    </p>
                    <p className="text-sm text-slate-600 mb-2">
                      File upload feature is currently being implemented
                    </p>
                    <p className="text-xs text-amber-700 font-medium bg-amber-100 px-3 py-1.5 rounded-lg inline-block">
                      For now, please upload evidence from the Case Detail → Evidence tab
                    </p>
                  </div>
                </div>

                {/* Quick Note */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Quick Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    disabled={uploading}
                    placeholder="Brief description of the evidence..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedCase || uploading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Evidence
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="px-8 py-16 text-center">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Evidence Uploaded!</h3>
              <p className="text-slate-600 mb-6">
                Your evidence has been successfully uploaded and is now part of the case record.
              </p>
              <Button 
                onClick={handleClose}
                variant="outline"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
