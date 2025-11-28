'use client'

import { useState, useEffect } from 'react'
import { Button } from '@jctc/ui'

type EvidenceCategory = 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT'
type RetentionPolicy = 'PERMANENT' | 'CASE_CLOSE_PLUS_7' | 'CASE_CLOSE_PLUS_1' | 'DESTROY_AFTER_TRIAL'

interface EvidenceFormData {
  label: string
  category: EvidenceCategory
  description: string
  storage_location: string
  sha256_hash?: string
  file_path?: string
  file_size?: number
  retention_policy: RetentionPolicy
  collected_at: string
  notes: string
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
}

export function EvidenceFormModal({ isOpen, onClose, onSubmit, editingEvidence }: EvidenceFormModalProps) {
  const [formData, setFormData] = useState<EvidenceFormData>({
    label: '',
    category: 'DIGITAL',
    description: '',
    storage_location: '',
    sha256_hash: '',
    file_path: '',
    file_size: undefined,
    retention_policy: 'CASE_CLOSE_PLUS_7',
    collected_at: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingEvidence) {
      setFormData({
        label: editingEvidence.label,
        category: editingEvidence.category,
        description: editingEvidence.description || '',
        storage_location: editingEvidence.storage_location || '',
        sha256_hash: editingEvidence.sha256_hash || '',
        file_path: editingEvidence.file_path || '',
        file_size: editingEvidence.file_size,
        retention_policy: editingEvidence.retention_policy,
        collected_at: editingEvidence.collected_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        notes: editingEvidence.notes || '',
      })
    } else {
      // Reset form for adding
      setFormData({
        label: '',
        category: 'DIGITAL',
        description: '',
        storage_location: '',
        sha256_hash: '',
        file_path: '',
        file_size: undefined,
        retention_policy: 'CASE_CLOSE_PLUS_7',
        collected_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [editingEvidence, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.label || !formData.description) {
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

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
          <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-slate-900">
              {editingEvidence ? 'Edit Evidence' : 'Add Evidence'}
            </h2>
            <p className="text-slate-600 mt-1">
              {editingEvidence ? `Editing ${editingEvidence.evidence_number}` : 'Register new evidence item'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
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
                  <option value="DIGITAL">Digital Evidence</option>
                  <option value="PHYSICAL">Physical Evidence</option>
                  <option value="DOCUMENT">Document Evidence</option>
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
                  onChange={(e) => setFormData({ ...formData, retention_policy: e.target.value as RetentionPolicy })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                >
                  <option value="PERMANENT">Permanent</option>
                  <option value="CASE_CLOSE_PLUS_7">Case Close + 7 Years</option>
                  <option value="CASE_CLOSE_PLUS_1">Case Close + 1 Year</option>
                  <option value="DESTROY_AFTER_TRIAL">Destroy After Trial</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                placeholder="Detailed description of the evidence item"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Storage Location */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  placeholder="e.g., Vault A, Shelf 3, Box 12"
                />
              </div>

              {/* Collection Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Collection Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.collected_at}
                  onChange={(e) => setFormData({ ...formData, collected_at: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Digital Evidence Fields */}
            {formData.category === 'DIGITAL' && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Digital Evidence Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      File Path
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono text-sm"
                    placeholder="64-character SHA-256 hash (optional)"
                    maxLength={64}
                  />
                  {formData.sha256_hash && formData.sha256_hash.length > 0 && formData.sha256_hash.length !== 64 && (
                    <p className="text-sm text-orange-600 mt-1">⚠️ SHA-256 hash should be exactly 64 characters</p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                placeholder="Additional notes about collection, handling, or special considerations"
              />
            </div>
          </form>

          <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (editingEvidence ? 'Updating...' : 'Adding...') : (editingEvidence ? 'Update Evidence' : 'Add Evidence')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
