'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'
import { useSeizures, useSeizureMutations } from '../../lib/hooks/useSeizures'

interface SeizureManagerProps {
  caseId: string
  seizures?: any[]
}

export function SeizureManager({ caseId, seizures: propSeizures }: SeizureManagerProps) {
  const { data: fetchedSeizures = [], isLoading } = useSeizures(caseId)
  const { createSeizure, loading: mutationLoading } = useSeizureMutations(caseId)
  
  // Use prop seizures if provided, otherwise use fetched data
  const seizures = propSeizures || fetchedSeizures

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSeizureId, setSelectedSeizureId] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [witnessInput, setWitnessInput] = useState('')
  const [witnesses, setWitnesses] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    seized_at: '',
    location: '',
    officer_id: 'user-003', // Default to current user
    notes: '',
    warrant_number: '',
    warrant_type: '',
    issuing_authority: '',
    description: '',
    items_count: '',
    status: 'COMPLETED' as const,
  })

  const handleOpenModal = () => {
    setFormData({
      seized_at: new Date().toISOString().slice(0, 16),
      location: '',
      officer_id: 'user-003',
      notes: '',
      warrant_number: '',
      warrant_type: '',
      issuing_authority: '',
      description: '',
      items_count: '',
      status: 'COMPLETED',
    })
    setWitnesses([])
    setWitnessInput('')
    setPhotoFiles([])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSeizureId(null)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setPhotoFiles([...photoFiles, ...filesArray])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(photoFiles.filter((_, i) => i !== index))
  }

  const handleAddWitness = () => {
    if (witnessInput.trim()) {
      setWitnesses([...witnesses, witnessInput.trim()])
      setWitnessInput('')
    }
  }

  const handleRemoveWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createSeizure({
        ...formData,
        witnesses,
        photos: photoFiles,
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error creating seizure:', error)
      alert('Failed to create seizure record')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-neutral-500">Loading seizures...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Seizure Records</h3>
          <p className="text-sm text-slate-600 mt-1">Physical evidence seizures with photo documentation</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2.5 bg-black text-white rounded-lg font-medium shadow-sm hover:shadow-md hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Seizure
        </button>
      </div>

      {/* Seizures List */}
      {seizures.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-neutral-900 font-medium">No seizure records yet</p>
                <p className="text-sm text-neutral-500 mt-1">Log your first evidence seizure to get started</p>
              </div>
              <button
                onClick={handleOpenModal}
                className="mt-2 px-4 py-2 bg-black text-white rounded-lg font-medium shadow-sm hover:shadow hover:bg-neutral-800 transition-all active:scale-95"
              >
                Log First Seizure
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {seizures.map((seizure) => (
            <Card key={seizure.id} className="hover:shadow-lg transition-all duration-300 border border-neutral-200 hover:border-blue-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">Evidence Seizure</h4>
                        <p className="text-sm text-slate-600">{formatDate(seizure.seized_at)}</p>
                      </div>
                    </div>
                  </div>
                  <Badge variant="critical" className="bg-red-100 text-red-800 border-red-200">
                    {seizure.photos.length} Photo{seizure.photos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Seizure Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location
                    </div>
                    <p className="text-sm font-medium text-slate-900">{seizure.location}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Seizing Officer
                    </div>
                    <p className="text-sm font-medium text-slate-900">{seizure.officer_name}</p>
                  </div>
                </div>

                {/* Witnesses */}
                {seizure.witnesses.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Witnesses
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seizure.witnesses.map((witness: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                          {witness}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {seizure.notes && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-slate-50 to-neutral-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Notes
                    </div>
                    <p className="text-sm text-slate-700">{seizure.notes}</p>
                  </div>
                )}

                {/* Photo Gallery */}
                {seizure.photos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Photo Documentation ({seizure.photos.length})
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {seizure.photos.map((photo: { id: string; file_name: string; file_size: number }) => (
                        <div key={photo.id} className="group relative bg-neutral-100 rounded-lg border border-neutral-200 hover:border-blue-300 transition-all overflow-hidden">
                          <div className="aspect-video flex items-center justify-center p-4">
                            <svg className="w-12 h-12 text-neutral-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="p-2 bg-white border-t border-neutral-200">
                            <p className="text-xs font-medium text-slate-900 truncate" title={photo.file_name}>
                              {photo.file_name}
                            </p>
                            <p className="text-xs text-slate-500">{formatFileSize(photo.file_size)}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="font-mono">SHA-256</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => setSelectedSeizureId(seizure.id)}
                    className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details
                  </button>
                  <button
                    className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Seizure Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Log Evidence Seizure</h2>
                <p className="text-slate-600 mt-1">Record physical evidence seizure with photo documentation</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date & Time Seized <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.seized_at}
                    onChange={(e) => setFormData({ ...formData, seized_at: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Seizure Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., 45 Allen Avenue, Ikeja, Lagos State"
                  />
                </div>

                {/* Legal Authorization Section */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Legal Authorization
                  </h4>
                  <div className="space-y-4">
                    {/* Warrant Type & Number */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Warrant Type</label>
                        <select
                          value={formData.warrant_type}
                          onChange={(e) => setFormData({ ...formData, warrant_type: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="">Select type...</option>
                          <option value="SEARCH_WARRANT">Search Warrant</option>
                          <option value="PRODUCTION_ORDER">Production Order</option>
                          <option value="COURT_ORDER">Court Order</option>
                          <option value="SEIZURE_ORDER">Seizure Order</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Warrant Number</label>
                        <input
                          type="text"
                          value={formData.warrant_number}
                          onChange={(e) => setFormData({ ...formData, warrant_number: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="e.g., SW/2024/123"
                        />
                      </div>
                    </div>
                    {/* Issuing Authority */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Issuing Authority</label>
                      <input
                        type="text"
                        value={formData.issuing_authority}
                        onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        placeholder="e.g., High Court of Lagos State"
                      />
                    </div>
                  </div>
                </div>

                {/* Seizure Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Items Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.items_count}
                      onChange={(e) => setFormData({ ...formData, items_count: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="Total items seized"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DISPUTED">Disputed</option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Seizure Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Detailed description of what was seized and circumstances..."
                  />
                </div>

                {/* Witnesses */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Witnesses</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={witnessInput}
                      onChange={(e) => setWitnessInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWitness())}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="Enter witness name and press Add"
                    />
                    <button
                      type="button"
                      onClick={handleAddWitness}
                      className="px-4 py-3 bg-black text-white rounded-xl font-medium shadow-sm hover:shadow hover:bg-neutral-800 transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                  {witnesses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {witnesses.map((witness, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                          {witness}
                          <button
                            type="button"
                            onClick={() => handleRemoveWitness(idx)}
                            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Photo Documentation</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-slate-400 transition-colors">
                    <input
                      type="file"
                      id="photos"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="photos"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">Click to upload photos</span>
                      <span className="text-xs text-slate-500">or drag and drop</span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB each</span>
                    </label>
                  </div>
                  {photoFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {photoFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{file.name}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        All photos will be automatically hashed (SHA-256) for integrity verification
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Describe circumstances of seizure, condition of items, any relevant observations..."
                  />
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl font-medium shadow-sm hover:shadow transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={mutationLoading}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {mutationLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Log Seizure
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
