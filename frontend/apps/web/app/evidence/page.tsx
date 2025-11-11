'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card, Badge } from '@jctc/ui'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { useEvidence } from '@/lib/hooks/useEvidence'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

const mockEvidenceRemoved = [
  {
    id: '1',
    evidence_number: 'EVD-2025-001',
    type: 'DIGITAL',
    description: 'Email correspondence regarding fraudulent transaction',
    case_number: 'JCTC-2025-A7B3C',
    case_title: 'Business Email Compromise - ABC Corp',
    collected_date: '2025-01-16',
    collected_by: 'Jane Smith',
    chain_of_custody_status: 'SECURE',
  },
  {
    id: '2',
    evidence_number: 'EVD-2025-002',
    type: 'DIGITAL',
    description: 'Bank transaction records showing wire transfer',
    case_number: 'JCTC-2025-A7B3C',
    case_title: 'Business Email Compromise - ABC Corp',
    collected_date: '2025-01-17',
    collected_by: 'John Doe',
    chain_of_custody_status: 'SECURE',
  },
  {
    id: '3',
    evidence_number: 'EVD-2025-003',
    type: 'PHYSICAL',
    description: 'Hard drive containing suspect data',
    case_number: 'JCTC-2025-B8C4D',
    case_title: 'Corporate Data Breach',
    collected_date: '2025-01-18',
    collected_by: 'Sarah Johnson',
    chain_of_custody_status: 'IN_TRANSIT',
  },
]

function EvidenceListContent() {
  const { logout } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showChainOfCustody, setShowChainOfCustody] = useState(false)

  // Mock chain of custody data
  const mockChainOfCustody = [
    {
      id: '1',
      timestamp: '2025-01-16T09:30:00Z',
      action: 'COLLECTED',
      from_person: null,
      to_person: 'Jane Smith',
      location: 'Crime Scene - ABC Corp Office, Floor 3',
      purpose: 'Initial evidence collection from suspect workstation',
      notes: 'Evidence collected in sealed tamper-evident bag. Photographed in situ before collection.',
      signature_verified: true,
    },
    {
      id: '2',
      timestamp: '2025-01-16T14:15:00Z',
      action: 'TRANSFERRED',
      from_person: 'Jane Smith',
      to_person: 'Michael Chen',
      location: 'Evidence Room A - JCTC Headquarters',
      purpose: 'Transfer to digital forensics lab for analysis',
      notes: 'Seal integrity verified. Evidence bag unopened. Logged into evidence management system.',
      signature_verified: true,
    },
    {
      id: '3',
      timestamp: '2025-01-17T10:00:00Z',
      action: 'EXAMINED',
      from_person: 'Michael Chen',
      to_person: 'Michael Chen',
      location: 'Digital Forensics Lab - Room 204',
      purpose: 'Forensic analysis and data extraction',
      notes: 'Created forensic image using FTK Imager. Hash values: MD5 verified. Original evidence resealed.',
      signature_verified: true,
    },
    {
      id: '4',
      timestamp: '2025-01-17T16:45:00Z',
      action: 'TRANSFERRED',
      from_person: 'Michael Chen',
      to_person: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Long-term secure storage pending trial',
      notes: 'Analysis complete. Evidence returned to secure storage. Climate-controlled environment.',
      signature_verified: true,
    },
    {
      id: '5',
      timestamp: '2025-01-20T11:20:00Z',
      action: 'ACCESSED',
      from_person: 'Sarah Johnson',
      to_person: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Inspection by defense counsel',
      notes: 'Evidence presented to defense attorney. Seal inspected - intact. No tampering detected.',
      signature_verified: true,
    },
  ]

  // Fetch evidence from API with filters
  const { evidence, total, loading, error, refetch } = useEvidence({
    search: searchTerm || undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    chain_of_custody_status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-slate-200 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Evidence</h3>
              <p className="text-red-700 mb-4">{error.message}</p>
              <Button onClick={refetch} variant="outline">Retry</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SECURE':
        return { variant: 'success' as const, label: 'Secure' }
      case 'IN_TRANSIT':
        return { variant: 'warning' as const, label: 'In Transit' }
      case 'COMPROMISED':
        return { variant: 'critical' as const, label: 'Compromised' }
      default:
        return { variant: 'default' as const, label: status }
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DIGITAL':
        return { variant: 'info' as const, label: 'Digital' }
      case 'PHYSICAL':
        return { variant: 'default' as const, label: 'Physical' }
      case 'DOCUMENT':
        return { variant: 'default' as const, label: 'Document' }
      default:
        return { variant: 'default' as const, label: type }
    }
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
              Evidence Management
            </h1>
            <p className="text-lg text-slate-600">
              Track and manage digital and physical evidence across all investigations
            </p>
          </div>
          <Link href="/evidence/upload">
            <Button className="bg-black text-white hover:bg-neutral-800 shadow-lg hover:shadow-xl transition-all">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Evidence
            </Button>
          </Link>
        </div>
      </div>

      {/* Premium Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search evidence number, case, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="DIGITAL">Digital</option>
            <option value="PHYSICAL">Physical</option>
            <option value="DOCUMENT">Document</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="SECURE">Secure</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPROMISED">Compromised</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-slate-900">
          {evidence.length} {evidence.length === 1 ? 'Evidence Item' : 'Evidence Items'}
        </p>
      </div>

      {/* Premium Evidence Grid */}
      <div className="space-y-3">
        {evidence.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No evidence found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters to find what you\'re looking for.'
                  : 'Upload your first evidence item to get started.'}
              </p>
              <Link href="/evidence/upload">
                <Button className="bg-black text-white hover:bg-neutral-800 shadow-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Evidence
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          evidence.map((evidenceItem) => {
            const typeColors = {
              DIGITAL: 'bg-blue-100 text-blue-700 border-blue-200',
              PHYSICAL: 'bg-purple-100 text-purple-700 border-purple-200',
              DOCUMENT: 'bg-amber-100 text-amber-700 border-amber-200',
            }
            const statusColors = {
              SECURE: 'bg-green-100 text-green-700 border-green-200',
              IN_TRANSIT: 'bg-amber-100 text-amber-700 border-amber-200',
              COMPROMISED: 'bg-red-100 text-red-700 border-red-200',
            }
            
            return (
              <div key={evidenceItem.id} className="group bg-white rounded-2xl border border-slate-200/60 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {evidenceItem.evidence_number}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeColors[evidenceItem.type as keyof typeof typeColors] || typeColors.DIGITAL}`}>
                              {getTypeBadge(evidenceItem.type).label}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[evidenceItem.chain_of_custody_status as keyof typeof statusColors] || statusColors.SECURE}`}>
                              {getStatusBadge(evidenceItem.chain_of_custody_status).label}
                            </span>
                          </div>
                          <p className="text-slate-700 mb-4 line-clamp-2">{evidenceItem.description}</p>
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Related Case</span>
                          <Link
                            href={`/cases/${evidenceItem.case_id}`}
                            className="block text-blue-600 hover:text-blue-700 font-semibold mt-1"
                          >
                            {evidenceItem.case_number || evidenceItem.case_id}
                          </Link>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Collected</span>
                          <p className="text-slate-900 font-medium mt-1">
                            {new Date(evidenceItem.collected_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Collected By</span>
                          <p className="text-slate-900 font-medium mt-1">{evidenceItem.collected_by}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="whitespace-nowrap"
                        onClick={() => {
                          setSelectedEvidence(evidenceItem)
                          setIsDrawerOpen(true)
                        }}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Premium Evidence Details Drawer */}
      {isDrawerOpen && selectedEvidence && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 shadow-2xl z-50 overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedEvidence.evidence_number}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedEvidence.type === 'DIGITAL' ? 'bg-blue-100 text-blue-700' :
                          selectedEvidence.type === 'PHYSICAL' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {getTypeBadge(selectedEvidence.type).label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedEvidence.chain_of_custody_status === 'SECURE' ? 'bg-green-100 text-green-700' :
                          selectedEvidence.chain_of_custody_status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getStatusBadge(selectedEvidence.chain_of_custody_status).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Description</h3>
                <p className="text-slate-900 leading-relaxed">{selectedEvidence.description}</p>
              </div>

              {/* Evidence Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</p>
                      <p className="text-base font-bold text-slate-900">{getTypeBadge(selectedEvidence.type).label}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                      <p className="text-base font-bold text-slate-900">{getStatusBadge(selectedEvidence.chain_of_custody_status).label}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</p>
                      <p className="text-base font-bold text-slate-900">
                        {new Date(selectedEvidence.collected_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected By</p>
                      <p className="text-base font-bold text-slate-900">{selectedEvidence.collected_by}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Case */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Related Case
                </h3>
                <Link
                  href={`/cases/${selectedEvidence.case_id}`}
                  className="block text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  {selectedEvidence.case_number || selectedEvidence.case_id}
                </Link>
              </div>

              {/* Chain of Custody Section */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Chain of Custody
                      <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {mockChainOfCustody.length} Records
                      </span>
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowChainOfCustody(!showChainOfCustody)}
                    >
                      {showChainOfCustody ? 'Hide' : 'View Full Chain'}
                      <svg 
                        className={`w-4 h-4 ml-1.5 transition-transform ${
                          showChainOfCustody ? 'rotate-90' : ''
                        }`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {!showChainOfCustody && (
                  <div className="p-6">
                    <p className="text-slate-600">View complete chain of custody records and transfer history.</p>
                  </div>
                )}

                {showChainOfCustody && (
                  <div className="p-6">
                    {/* Timeline */}
                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>
                      
                      <div className="space-y-6">
                        {mockChainOfCustody.map((record, index) => {
                          const actionColors = {
                            COLLECTED: 'from-emerald-500 to-emerald-600',
                            TRANSFERRED: 'from-blue-500 to-blue-600',
                            EXAMINED: 'from-purple-500 to-purple-600',
                            ACCESSED: 'from-amber-500 to-amber-600',
                          }
                          const actionIcons = {
                            COLLECTED: (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            ),
                            TRANSFERRED: (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            ),
                            EXAMINED: (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            ),
                            ACCESSED: (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            ),
                          }
                          
                          return (
                            <div key={record.id} className="relative pl-16">
                              {/* Timeline Node */}
                              <div className="absolute left-0 flex items-center justify-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${
                                  actionColors[record.action as keyof typeof actionColors] || actionColors.TRANSFERRED
                                }`}>
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {actionIcons[record.action as keyof typeof actionIcons] || actionIcons.TRANSFERRED}
                                  </svg>
                                </div>
                              </div>

                              {/* Record Card */}
                              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-blue-300 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-base font-bold text-slate-900">{record.action}</h4>
                                      {record.signature_verified && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Verified
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{record.purpose}</p>
                                  </div>
                                  <span className="text-xs font-medium text-slate-500">
                                    {new Date(record.timestamp).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>

                                {/* Transfer Details */}
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  {record.from_person && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">From</p>
                                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {record.from_person}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                      {record.from_person ? 'To' : 'By'}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      {record.to_person}
                                    </p>
                                  </div>
                                </div>

                                {/* Location */}
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</p>
                                  <p className="text-sm text-slate-900 flex items-start gap-1.5">
                                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {record.location}
                                  </p>
                                </div>

                                {/* Notes */}
                                {record.notes && (
                                  <div className="pt-3 border-t border-slate-200">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{record.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1 shadow-lg shadow-blue-500/20">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Evidence
                </Button>
                <Button variant="outline" className="flex-1">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Files
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

export default function EvidencePage() {
  return (
    <ProtectedRoute requireAuth requiredPermissions={['evidence:view']}>
      <EvidenceListContent />
    </ProtectedRoute>
  )
}
