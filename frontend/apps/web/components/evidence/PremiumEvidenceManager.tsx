'use client'

import { useState } from 'react'
import { Button, Badge } from '@jctc/ui'

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

interface CustodyEntry {
  id: string
  evidence_id: string
  timestamp: string
  action: 'COLLECTED' | 'TRANSFERRED' | 'EXAMINED' | 'ACCESSED' | 'RETURNED'
  from_person: string | null
  from_person_name?: string
  to_person: string
  to_person_name: string
  location: string
  purpose: string
  notes?: string
  signature_verified: boolean
  created_by: string
  created_by_name: string
  created_at: string
}

interface PremiumEvidenceManagerProps {
  caseId: string
  evidence: EvidenceItem[]
  onAdd: () => void
  onEdit: (item: EvidenceItem) => void
  onDelete: (id: string) => void
  onGenerateQR: (id: string) => Promise<string>
  onVerifyHash: (id: string) => Promise<boolean>
  custodyEntries: CustodyEntry[]
  onAddCustodyEntry: () => void
}

export function PremiumEvidenceManager({
  caseId,
  evidence,
  onAdd,
  onEdit,
  onDelete,
  onGenerateQR,
  onVerifyHash,
  custodyEntries,
  onAddCustodyEntry,
}: PremiumEvidenceManagerProps) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(
    evidence.length > 0 ? evidence[0].id : null
  )
  const [filterCategory, setFilterCategory] = useState<EvidenceCategory | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isVerifying, setIsVerifying] = useState<string | null>(null)

  const selectedEvidence = evidence.find((e) => e.id === selectedEvidenceId)
  const selectedCustodyEntries = custodyEntries.filter((c) => c.evidence_id === selectedEvidenceId)

  // Filter evidence
  const filteredEvidence = evidence.filter((item) => {
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory
    const matchesSearch = 
      searchQuery === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.evidence_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryIcon = (category: EvidenceCategory) => {
    const icons = {
      DIGITAL: '💾',
      PHYSICAL: '📦',
      DOCUMENT: '📄',
    }
    return icons[category]
  }

  const getCategoryColor = (category: EvidenceCategory) => {
    const colors = {
      DIGITAL: 'bg-blue-100 text-blue-700 border-blue-200',
      PHYSICAL: 'bg-purple-100 text-purple-700 border-purple-200',
      DOCUMENT: 'bg-amber-100 text-amber-700 border-amber-200',
    }
    return colors[category]
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleVerifyHash = async (id: string) => {
    setIsVerifying(id)
    try {
      const isValid = await onVerifyHash(id)
      alert(isValid ? '✓ Hash verification successful' : '✗ Hash verification failed')
    } catch (error) {
      console.error('Error verifying hash:', error)
      alert('Failed to verify hash')
    } finally {
      setIsVerifying(null)
    }
  }

  const getActionIcon = (action: CustodyEntry['action']) => {
    switch (action) {
      case 'COLLECTED':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        )
      case 'TRANSFERRED':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        )
      case 'EXAMINED':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        )
      case 'ACCESSED':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        )
      case 'RETURNED':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        )
    }
  }

  const getActionColor = (action: CustodyEntry['action']) => {
    const colors = {
      COLLECTED: 'from-emerald-500 to-emerald-600',
      TRANSFERRED: 'from-blue-500 to-blue-600',
      EXAMINED: 'from-purple-500 to-purple-600',
      ACCESSED: 'from-amber-500 to-amber-600',
      RETURNED: 'from-indigo-500 to-indigo-600',
    }
    return colors[action]
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-320px)]">
      {/* LEFT COLUMN - Evidence List (30%) */}
      <div className="w-[30%] flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Evidence Items</h3>
            <Button 
              onClick={onAdd}
              size="sm" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          {/* Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as EvidenceCategory | 'ALL')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="ALL">All Categories ({evidence.length})</option>
            <option value="DIGITAL">💾 Digital ({evidence.filter((e) => e.category === 'DIGITAL').length})</option>
            <option value="PHYSICAL">📦 Physical ({evidence.filter((e) => e.category === 'PHYSICAL').length})</option>
            <option value="DOCUMENT">📄 Documents ({evidence.filter((e) => e.category === 'DOCUMENT').length})</option>
          </select>
        </div>

        {/* Evidence List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredEvidence.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium">No evidence found</p>
            </div>
          ) : (
            filteredEvidence.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedEvidenceId(item.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedEvidenceId === item.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getCategoryIcon(item.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.label}</h4>
                      {item.sha256_hash && (
                        <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-mono text-blue-600 mb-2">{item.evidence_number}</p>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER COLUMN - Evidence Details (45%) */}
      <div className="w-[45%] flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {selectedEvidence ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      {getCategoryIcon(selectedEvidence.category)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedEvidence.label}</h2>
                      <p className="text-sm font-mono text-blue-600">{selectedEvidence.evidence_number}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(selectedEvidence.category)}`}>
                    {selectedEvidence.category}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onEdit(selectedEvidence)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onGenerateQR(selectedEvidence.id)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Code
                </Button>
                {selectedEvidence.sha256_hash && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleVerifyHash(selectedEvidence.id)}
                    disabled={isVerifying === selectedEvidence.id}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isVerifying === selectedEvidence.id ? 'Verifying...' : 'Verify'}
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onDelete(selectedEvidence.id)}
                  className="border-red-300 text-red-600 hover:bg-red-50 ml-auto"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
            </div>

            {/* Details Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              {selectedEvidence.description && (
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200/60 p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-sm text-slate-900 leading-relaxed">{selectedEvidence.description}</p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                {selectedEvidence.storage_location && (
                  <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-500 uppercase">Storage</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{selectedEvidence.storage_location}</p>
                  </div>
                )}

                {selectedEvidence.file_size && (
                  <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-500 uppercase">File Size</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatFileSize(selectedEvidence.file_size)}</p>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-500 uppercase">Collected</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(selectedEvidence.collected_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-500 uppercase">Collected By</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{selectedEvidence.collected_by_name}</p>
                </div>
              </div>

              {/* Hash */}
              {selectedEvidence.sha256_hash && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-semibold text-green-800 uppercase">SHA-256 Hash</span>
                  </div>
                  <code className="text-xs text-green-700 break-all font-mono leading-relaxed">
                    {selectedEvidence.sha256_hash}
                  </code>
                </div>
              )}

              {/* Notes */}
              {selectedEvidence.notes && (
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                  <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">Notes</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">{selectedEvidence.notes}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Select an evidence item to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - Chain of Custody (25%) */}
      <div className="w-[25%] flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Chain of Custody
            </h3>
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
              {selectedCustodyEntries.length}
            </span>
          </div>
          <Button 
            size="sm" 
            onClick={onAddCustodyEntry}
            disabled={!selectedEvidenceId}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedEvidenceId ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-xs">Select evidence to view custody chain</p>
            </div>
          ) : selectedCustodyEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xs font-medium mb-1">No custody records</p>
              <p className="text-xs">Add the first entry to start tracking</p>
            </div>
          ) : (
            <div className="relative space-y-3">
              {/* Vertical timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>

              {selectedCustodyEntries.map((entry, index) => (
                <div key={entry.id} className="relative pl-12">
                  {/* Timeline node */}
                  <div className="absolute left-0 flex items-center justify-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${getActionColor(entry.action)}`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {getActionIcon(entry.action)}
                      </svg>
                    </div>
                  </div>

                  {/* Entry card */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">{entry.action}</span>
                      {entry.signature_verified && (
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">{entry.purpose}</p>

                    <div className="space-y-1 text-xs">
                      {entry.from_person_name && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="font-medium">From:</span>
                          <span>{entry.from_person_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="font-medium">To:</span>
                        <span>{entry.to_person_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
