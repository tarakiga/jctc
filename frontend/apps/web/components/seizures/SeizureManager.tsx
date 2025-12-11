'use client'

import { useState } from 'react'
import { Card, CardContent, Badge } from '@jctc/ui'
import { useSeizures, useSeizureMutations } from '../../lib/hooks/useSeizures'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { useLegalInstruments } from '@/lib/hooks/useLegalInstruments'
import { useUsers } from '@/lib/hooks/useUsers'
import { useEvidenceItems } from '@/lib/hooks/useEvidenceManagement'

interface SeizureManagerProps {
  caseId: string
}

export function SeizureManager({ caseId }: SeizureManagerProps) {
  const { data: seizures = [], isLoading } = useSeizures(caseId)
  const { createSeizure, loading: mutationLoading } = useSeizureMutations(caseId)

  // NEW: Fetch legal instruments for selection dropdown
  const { data: legalInstruments = [] } = useLegalInstruments(caseId)

  // NEW: Fetch users for officer selection
  const { users = [] } = useUsers()

  // Fetch evidence items to display count per seizure
  const { data: evidenceItems = [] } = useEvidenceItems(caseId)

  // Helper to get evidence count for a specific seizure
  const getEvidenceCountForSeizure = (seizureId: string) => {
    return evidenceItems.filter(e => e.seizure_id === seizureId).length
  }

  // Fetch seizure-related lookup values
  const {
    [LOOKUP_CATEGORIES.WARRANT_TYPE]: warrantTypeLookup,
    [LOOKUP_CATEGORIES.ISSUING_AUTHORITY]: issuingAuthorityLookup,
    [LOOKUP_CATEGORIES.SEIZURE_STATUS]: seizureStatusLookup
  } = useLookups([
    LOOKUP_CATEGORIES.WARRANT_TYPE,
    LOOKUP_CATEGORIES.ISSUING_AUTHORITY,
    LOOKUP_CATEGORIES.SEIZURE_STATUS
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSeizureId, setSelectedSeizureId] = useState<string | null>(null)
  const [witnessInput, setWitnessInput] = useState('')
  const [witnesses, setWitnesses] = useState<string[]>([])

  const [formData, setFormData] = useState({
    seized_at: '',
    location: '',
    officer_id: '',  // NEW: Seizing officer
    legal_instrument_id: '',  // Link to legal instrument
    warrant_number: '',  // Deprecated but kept for fallback
    warrant_type: '',
    issuing_authority: '',
    description: '',
    items_count: '',  // Deprecated: will be computed from evidence
    status: 'COMPLETED' as const,
  })

  // Prevent future dates
  const maxDate = new Date().toISOString()

  const handleOpenModal = () => {
    setFormData({
      seized_at: new Date().toISOString().slice(0, 16),
      location: '',
      officer_id: '',
      legal_instrument_id: '',
      warrant_number: '',
      warrant_type: '',
      issuing_authority: '',
      description: '',
      items_count: '',
      status: 'COMPLETED',
    })
    setWitnesses([])
    setWitnessInput('')
    setIsModalOpen(true)
  }

  // NEW: Handle Edit button click
  const handleEdit = (seizure: any) => {
    setFormData({
      seized_at: seizure.seized_at ? new Date(seizure.seized_at).toISOString().slice(0, 16) : '',
      location: seizure.location || '',
      officer_id: seizure.officer_id || '',
      legal_instrument_id: seizure.legal_instrument_id || '',
      warrant_number: seizure.warrant_number || '',
      warrant_type: seizure.warrant_type || '',
      issuing_authority: seizure.issuing_authority || '',
      description: seizure.description || '',
      items_count: seizure.items_count?.toString() || '',
      status: seizure.status || 'COMPLETED',
    })
    // Handle witnesses - could be strings or objects
    const witnessNames = (seizure.witnesses || []).map((w: any) =>
      typeof w === 'string' ? w : w?.name || ''
    ).filter(Boolean)
    setWitnesses(witnessNames)
    setWitnessInput('')
    setSelectedSeizureId(seizure.id)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSeizureId(null)
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
      // Destructure out items_count (now computed, not user-provided)
      const { items_count, ...submitData } = formData

      console.log('Submitting seizure:', {
        ...submitData,
        legal_instrument_id: submitData.legal_instrument_id || undefined,
        witnesses,
      })

      await createSeizure({
        ...submitData,
        // Convert IDs to proper format (undefined if empty)
        legal_instrument_id: submitData.legal_instrument_id || undefined,
        officer_id: submitData.officer_id || undefined,
        witnesses,
        // officer_id will default to current user on backend if not provided
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error creating seizure:', error)
      alert(`Failed to create seizure record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
          <p className="text-sm text-slate-600 mt-1">Physical evidence seizures records</p>
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
                <p className="text-sm text-neutral-500 mt-1">Log your first seizure to get started</p>
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
                        <h4 className="text-lg font-semibold text-slate-900">Seizure Record</h4>
                        <p className="text-sm text-slate-600">{formatDate(seizure.seized_at)}</p>
                      </div>
                    </div>
                  </div>
                  {/* Evidence Count Badge */}
                  {(() => {
                    const count = getEvidenceCountForSeizure(seizure.id)
                    return count > 0 ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-blue-700">{count} Evidence</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-slate-500">No evidence linked</span>
                      </div>
                    )
                  })()}
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
                    <p className="text-sm font-medium text-slate-900">{seizure.officer_name || 'Officer'}</p>
                  </div>
                </div>

                {/* Witnesses */}
                {seizure.witnesses && seizure.witnesses.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Witnesses
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seizure.witnesses.map((witness: string | { name: string }, idx: number) => {
                        const witnessName = typeof witness === 'string' ? witness : witness?.name || 'Unknown'
                        return (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                            {witnessName}
                          </span>
                        )
                      })}
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

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => setSelectedSeizureId(selectedSeizureId === seizure.id ? null : seizure.id)}
                    className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2"
                  >
                    {selectedSeizureId === seizure.id ? 'Hide Details' : 'View Details'}
                  </button>
                  <button
                    onClick={() => handleEdit(seizure)}
                    className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2"
                  >
                    Edit
                  </button>
                </div>

                {/* Expanded Details Panel */}
                {selectedSeizureId === seizure.id && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-3">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Full Details
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Seizure ID:</span>
                        <p className="font-mono text-xs text-slate-700">{seizure.id}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>
                        <p className="font-medium text-slate-700">{seizure.status || 'N/A'}</p>
                      </div>
                      {seizure.warrant_number && (
                        <div>
                          <span className="text-slate-500">Warrant Number:</span>
                          <p className="font-medium text-slate-700">{seizure.warrant_number}</p>
                        </div>
                      )}
                      {seizure.warrant_type && (
                        <div>
                          <span className="text-slate-500">Warrant Type:</span>
                          <p className="font-medium text-slate-700">{seizure.warrant_type}</p>
                        </div>
                      )}
                      {seizure.issuing_authority && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Issuing Authority:</span>
                          <p className="font-medium text-slate-700">{seizure.issuing_authority}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-slate-500">Evidence Count:</span>
                        <p className="font-medium text-slate-700">{getEvidenceCountForSeizure(seizure.id)} items</p>
                      </div>
                      {seizure.legal_instrument && (
                        <div className="col-span-2 p-2 bg-white rounded-lg border border-blue-200">
                          <span className="text-slate-500">Linked Instrument:</span>
                          <p className="font-medium text-slate-700">
                            {seizure.legal_instrument.reference_no || 'No Reference'} - {seizure.legal_instrument.issuing_authority || 'Unknown Authority'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                <h2 className="text-3xl font-bold text-slate-900">
                  {selectedSeizureId ? 'Edit Seizure Record' : 'Log Evidence Seizure'}
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedSeizureId ? 'Update seizure details' : 'Record physical evidence seizure'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Date & Time */}
                <div>
                  <DateTimePicker
                    label="Date & Time Seized"
                    value={formData.seized_at}
                    onChange={(value) => setFormData({ ...formData, seized_at: value })}
                    required
                    maxDate={new Date()}
                    placeholder="Select seizure date and time"
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

                {/* Seizing Officer */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Seizing Officer
                    <span className="ml-2 text-xs text-slate-500 font-normal">(Defaults to current user if not selected)</span>
                  </label>
                  <select
                    value={formData.officer_id}
                    onChange={(e) => setFormData({ ...formData, officer_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select officer...</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.role ? `(${user.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Legal Authorization Section */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    Legal Authorization
                  </h4>
                  <div className="space-y-4">
                    {/* NEW: Authorizing Instrument Dropdown */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Authorizing Instrument
                        <span className="ml-2 text-xs text-slate-500 font-normal">(Recommended)</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={formData.legal_instrument_id}
                          onChange={(e) => setFormData({ ...formData, legal_instrument_id: e.target.value })}
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
                        >
                          <option value="">Select an existing warrant...</option>
                          {legalInstruments
                            .filter((li: any) => li.type === 'WARRANT' || li.type?.includes('WARRANT'))
                            .map((li: any) => (
                              <option key={li.id} value={li.id}>
                                {li.reference_no || 'No Ref'} - {li.issuing_authority || 'Unknown Authority'}
                                {li.status && ` (${li.status})`}
                              </option>
                            ))}
                        </select>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Link to an existing legal instrument, or enter warrant details manually below.
                      </p>
                    </div>

                    {/* Separator */}
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="flex-1 border-t border-slate-200"></div>
                      <span className="text-xs">or enter manually</span>
                      <div className="flex-1 border-t border-slate-200"></div>
                    </div>

                    {/* Legacy Warrant Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Warrant Type</label>
                        <select
                          value={formData.warrant_type}
                          onChange={(e) => setFormData({ ...formData, warrant_type: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="">Select type...</option>
                          {warrantTypeLookup?.values.map((v) => (
                            <option key={v.id} value={v.value}>{v.label}</option>
                          ))}
                          {/* Fallback defaults if lookup fails */}
                          {!warrantTypeLookup && (
                            <>
                              <option value="SEARCH_WARRANT">Search Warrant</option>
                              <option value="PRODUCTION_ORDER">Production Order</option>
                            </>
                          )}
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
                    {/* Issuing Authority - Lookup Driven */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Issuing Authority</label>
                      <select
                        value={formData.issuing_authority}
                        onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                      >
                        <option value="">Select authority...</option>
                        {issuingAuthorityLookup?.values.map((v) => (
                          <option key={v.id} value={v.value}>{v.label}</option>
                        ))}
                        {!issuingAuthorityLookup && (
                          <option value="HIGH_COURT">High Court</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seizure Details */}
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
                  <p className="text-xs text-slate-500 mt-1">
                    Items count is calculated automatically from logged evidence.
                  </p>
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
                  {mutationLoading ? 'Creating...' : 'Log Seizure'}
                </button>
              </div>
            </div>
          </div>
        </>
      )
      }
    </div >
  )
}
