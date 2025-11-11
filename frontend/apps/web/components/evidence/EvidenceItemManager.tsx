'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'

// Evidence types
type EvidenceCategory = 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT'
type RetentionPolicy = 'PERMANENT' | 'CASE_CLOSE_PLUS_7' | 'CASE_CLOSE_PLUS_1' | 'DESTROY_AFTER_TRIAL'

interface EvidenceItem {
  id: string
  case_id: string
  evidence_number: string
  label: string
  category: EvidenceCategory
  description?: string
  storage_location?: string
  sha256_hash?: string
  file_path?: string
  file_size?: number
  retention_policy: RetentionPolicy
  collected_by: string
  collected_by_name: string
  collected_at: string
  notes?: string
  qr_code?: string
  created_at: string
  updated_at: string
}

interface EvidenceItemManagerProps {
  caseId: string
  evidence: EvidenceItem[]
  onAdd: (evidence: Omit<EvidenceItem, 'id' | 'evidence_number' | 'created_at' | 'updated_at' | 'case_id' | 'collected_by' | 'collected_by_name' | 'qr_code'>) => Promise<void>
  onEdit: (id: string, evidence: Partial<EvidenceItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onGenerateQR: (id: string) => Promise<string>
  onVerifyHash: (id: string) => Promise<boolean>
  onViewCustody?: (id: string) => void
}

export function EvidenceItemManager({ 
  caseId, 
  evidence, 
  onAdd, 
  onEdit, 
  onDelete,
  onGenerateQR,
  onVerifyHash,
  onViewCustody
}: EvidenceItemManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem | null>(null)
  const [filterCategory, setFilterCategory] = useState<EvidenceCategory | 'ALL'>('ALL')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState<string | null>(null)
  const [formData, setFormData] = useState<Omit<EvidenceItem, 'id' | 'evidence_number' | 'created_at' | 'updated_at' | 'case_id' | 'collected_by' | 'collected_by_name' | 'qr_code'>>({
    label: '',
    category: 'DIGITAL',
    description: '',
    storage_location: '',
    sha256_hash: '',
    file_path: '',
    file_size: 0,
    retention_policy: 'PERMANENT',
    collected_at: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const handleOpenModal = (item?: EvidenceItem) => {
    if (item) {
      setEditingEvidence(item)
      setFormData({
        label: item.label,
        category: item.category,
        description: item.description,
        storage_location: item.storage_location,
        sha256_hash: item.sha256_hash,
        file_path: item.file_path,
        file_size: item.file_size,
        retention_policy: item.retention_policy,
        collected_at: item.collected_at,
        notes: item.notes,
      })
    } else {
      setEditingEvidence(null)
      setFormData({
        label: '',
        category: 'DIGITAL',
        description: '',
        storage_location: '',
        sha256_hash: '',
        file_path: '',
        file_size: 0,
        retention_policy: 'PERMANENT',
        collected_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingEvidence(null)
    setSelectedFile(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    
    // Compute SHA-256 hash
    try {
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      setFormData({
        ...formData,
        sha256_hash: hashHex,
        file_size: file.size,
        file_path: file.name,
      })
    } catch (error) {
      console.error('Error computing hash:', error)
      alert('Failed to compute file hash')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingEvidence) {
        await onEdit(editingEvidence.id, formData)
      } else {
        await onAdd(formData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving evidence:', error)
      alert('Failed to save evidence item')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this evidence item? This action cannot be undone.')) {
      try {
        await onDelete(id)
      } catch (error) {
        console.error('Error deleting evidence:', error)
        alert('Failed to delete evidence item')
      }
    }
  }

  const handleGenerateQR = async (id: string) => {
    try {
      const qrCode = await onGenerateQR(id)
      // Open QR code in new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Evidence QR Code</title>
              <style>
                body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
                .qr-container { text-align: center; }
                img { width: 300px; height: 300px; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img src="${qrCode}" alt="Evidence QR Code" />
                <p><strong>${evidence.find(e => e.id === id)?.evidence_number}</strong></p>
                <button onclick="window.print()">Print Label</button>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate QR code')
    }
  }

  const handleVerifyHash = async (id: string) => {
    setIsVerifying(id)
    try {
      const isValid = await onVerifyHash(id)
      alert(isValid ? '✓ Hash verification successful - file integrity confirmed' : '✗ Hash verification failed - file may be corrupted or tampered')
    } catch (error) {
      console.error('Error verifying hash:', error)
      alert('Failed to verify hash')
    } finally {
      setIsVerifying(null)
    }
  }

  const getCategoryBadge = (category: EvidenceCategory) => {
    const variants = {
      DIGITAL: { variant: 'info' as const, label: 'Digital', icon: '💾' },
      PHYSICAL: { variant: 'default' as const, label: 'Physical', icon: '📦' },
      DOCUMENT: { variant: 'default' as const, label: 'Document', icon: '📄' },
    }
    return variants[category]
  }

  const getRetentionLabel = (policy: RetentionPolicy): string => {
    const labels = {
      PERMANENT: 'Permanent',
      CASE_CLOSE_PLUS_7: 'Case Close + 7 Years',
      CASE_CLOSE_PLUS_1: 'Case Close + 1 Year',
      DESTROY_AFTER_TRIAL: 'Destroy After Trial',
    }
    return labels[policy]
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredEvidence = evidence.filter((item) => filterCategory === 'ALL' || item.category === filterCategory)

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filter */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as EvidenceCategory | 'ALL')}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="ALL">All Categories ({evidence.length})</option>
            <option value="DIGITAL">Digital ({evidence.filter((e) => e.category === 'DIGITAL').length})</option>
            <option value="PHYSICAL">Physical ({evidence.filter((e) => e.category === 'PHYSICAL').length})</option>
            <option value="DOCUMENT">Documents ({evidence.filter((e) => e.category === 'DOCUMENT').length})</option>
          </select>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-black text-white hover:bg-neutral-800">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Evidence Item
        </Button>
      </div>

      {/* Evidence List */}
      <div className="space-y-3">
        {filteredEvidence.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-neutral-500">
              No evidence items found. Click "Add Evidence Item" to create one.
            </CardContent>
          </Card>
        ) : (
          filteredEvidence.map((item) => {
            const categoryInfo = getCategoryBadge(item.category)
            
            return (
              <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border border-neutral-200 hover:border-blue-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="text-3xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                          {categoryInfo.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-neutral-900">{item.label}</h3>
                            <Badge {...categoryInfo} className="text-xs">{categoryInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 font-mono">
                              {item.evidence_number}
                            </Badge>
                            {item.sha256_hash && (
                              <Badge variant="success" className="text-xs">
                                ✓ Hash Verified
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-neutral-700 mb-4 leading-relaxed">{item.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            {item.storage_location && (
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <div>
                                  <span className="text-neutral-500 text-xs font-medium block">Storage Location</span>
                                  <span className="text-neutral-900 font-medium">{item.storage_location}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <span className="text-neutral-500 text-xs font-medium block">Retention Policy</span>
                                <span className="text-neutral-900 font-medium">{getRetentionLabel(item.retention_policy)}</span>
                              </div>
                            </div>
                            {item.file_size && (
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                  <span className="text-neutral-500 text-xs font-medium block">File Size</span>
                                  <span className="text-neutral-900 font-medium">{formatFileSize(item.file_size)}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <span className="text-neutral-500 text-xs font-medium block">Collected</span>
                                <span className="text-neutral-900 font-medium">{new Date(item.collected_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 col-span-2">
                              <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <div>
                                <span className="text-neutral-500 text-xs font-medium block">Collected By</span>
                                <span className="text-neutral-900 font-medium">{item.collected_by_name}</span>
                              </div>
                            </div>
                          </div>

                          {item.sha256_hash && (
                            <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <p className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                SHA-256 Hash:
                              </p>
                              <code className="text-xs text-green-700 break-all font-mono">{item.sha256_hash}</code>
                            </div>
                          )}

                          {item.notes && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Notes</p>
                              <p className="text-xs text-blue-800 leading-relaxed">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[180px]">
                      {onViewCustody && (
                        <button
                          onClick={() => onViewCustody(item.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Chain of Custody
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateQR(item.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm transition-all border border-neutral-300 hover:border-neutral-400 shadow-sm hover:shadow active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Generate QR
                      </button>
                      {item.sha256_hash && (
                        <button
                          onClick={() => handleVerifyHash(item.id)}
                          disabled={isVerifying === item.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-green-50 text-green-700 rounded-lg font-medium text-sm transition-all border border-green-300 hover:border-green-400 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isVerifying === item.id ? 'Verifying...' : 'Verify Hash'}
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm transition-all border border-neutral-300 hover:border-neutral-400 shadow-sm hover:shadow active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-lg font-medium text-sm transition-all border border-red-300 hover:border-red-400 shadow-sm hover:shadow active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">
                  {editingEvidence ? 'Edit Evidence Item' : 'Add Evidence Item'}
                </h2>
                <p className="text-slate-600 mt-1">Record evidence with automatic hash verification</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Label & Category */}
                <div className="grid grid-cols-2 gap-6">
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
                      placeholder="e.g., Laptop - HP EliteBook"
                    />
                  </div>

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
                      <option value="DIGITAL">💾 Digital</option>
                      <option value="PHYSICAL">📦 Physical</option>
                      <option value="DOCUMENT">📄 Document</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Detailed description of the evidence item"
                  />
                </div>

                {/* File Upload (for Digital evidence) */}
                {formData.category === 'DIGITAL' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Upload File {!editingEvidence && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      required={!editingEvidence}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ File selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                    {formData.sha256_hash && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-1">SHA-256 Hash (Auto-computed):</p>
                        <code className="text-xs text-green-600 break-all">{formData.sha256_hash}</code>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  {/* Storage Location */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Storage Location</label>
                    <input
                      type="text"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., Vault A, Shelf 3"
                    />
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

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Additional notes about this evidence item"
                  />
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800">
                  {editingEvidence ? 'Update Evidence' : 'Add Evidence'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
