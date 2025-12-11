'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@jctc/ui'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { useAllEvidence } from '@/lib/hooks/useEvidence'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EvidenceDetailDrawer } from '@/components/evidence/EvidenceDetailDrawer'

function EvidenceListContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Fetch all evidence globally with filters
  const categoryFilter = typeFilter !== 'ALL' ? typeFilter as 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT' : undefined
  const { data: allEvidence = [], isLoading: loading, error, refetch } = useAllEvidence({
    category: categoryFilter,
    search: searchTerm || undefined
  })

  // Apply local status filter (not available on backend yet)
  const evidence = useMemo(() => {
    if (statusFilter === 'ALL') return allEvidence
    return allEvidence.filter((e: any) => e.custody_status === statusFilter)
  }, [allEvidence, statusFilter])

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
              <p className="text-red-700 mb-4">{(error as Error).message}</p>
              <Button onClick={() => refetch()} variant="outline">Retry</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_VAULT':
        return { variant: 'success' as const, label: 'In Vault' }
      case 'RELEASED':
        return { variant: 'warning' as const, label: 'Released' }
      case 'RETURNED':
        return { variant: 'info' as const, label: 'Returned' }
      case 'DISPOSED':
        return { variant: 'critical' as const, label: 'Disposed' }
      default:
        return { variant: 'default' as const, label: status || 'Unknown' }
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
        return { variant: 'default' as const, label: type || 'Unknown' }
    }
  }

  const typeColors: Record<string, string> = {
    DIGITAL: 'bg-blue-100 text-blue-700 border-blue-200',
    PHYSICAL: 'bg-purple-100 text-purple-700 border-purple-200',
    DOCUMENT: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  const statusColors: Record<string, string> = {
    IN_VAULT: 'bg-green-100 text-green-700 border-green-200',
    RELEASED: 'bg-amber-100 text-amber-700 border-amber-200',
    RETURNED: 'bg-blue-100 text-blue-700 border-blue-200',
    DISPOSED: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            Evidence Management
          </h1>
          <p className="text-lg text-slate-600">
            Track and manage digital and physical evidence across all investigations
          </p>
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
            <option value="IN_VAULT">In Vault</option>
            <option value="RELEASED">Released</option>
            <option value="RETURNED">Returned</option>
            <option value="DISPOSED">Disposed</option>
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
              <p className="text-slate-600 mb-2">
                {searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters to find what you\'re looking for.'
                  : 'Evidence items will appear here once added to cases.'}
              </p>
              <p className="text-sm text-slate-500">
                To add evidence, navigate to a case and use the Assets section.
              </p>
            </div>
          </div>
        ) : (
          evidence.map((evidenceItem: any) => (
            <div key={evidenceItem.id} className="group bg-white rounded-xl border border-slate-200/60 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="p-4">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm mt-1">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {evidenceItem.label || evidenceItem.evidence_number}
                          </h3>
                          <div className="flex items-center gap-2">
                            {evidenceItem.category && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeColors[evidenceItem.category] || typeColors.DIGITAL}`}>
                                {getTypeBadge(evidenceItem.category).label}
                              </span>
                            )}
                            {evidenceItem.custody_status && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[evidenceItem.custody_status] || statusColors.IN_VAULT}`}>
                                {getStatusBadge(evidenceItem.custody_status).label}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-1 mb-3">{evidenceItem.description || 'No description provided'}</p>

                        {/* Meta Information - Compact Row */}
                        <div className="flex items-center gap-6 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Case:</span>
                            <Link
                              href={`/cases/${evidenceItem.case_id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium truncate hover:underline"
                            >
                              {evidenceItem.case_number || 'Unknown Case'}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Date:</span>
                            <span className="font-medium text-slate-700 truncate">
                              {evidenceItem.collected_at ? new Date(evidenceItem.collected_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0 hidden sm:flex">
                            <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">By:</span>
                            <span className="font-medium text-slate-700 truncate">{evidenceItem.collected_by_name || 'System'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                          onClick={() => {
                            setSelectedEvidence(evidenceItem)
                            setIsDrawerOpen(true)
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Evidence Details Drawer - Uses reusable component */}
      <EvidenceDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        evidence={selectedEvidence}
      />
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