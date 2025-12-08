'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@jctc/ui'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { useCases, useCaseMutations } from '@/lib/hooks/useCases'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { LookupValue } from '@/lib/services/lookups'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CreateCaseData } from '@/lib/services/cases'
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/lib/utils/countries'
import { NIGERIAN_STATES } from '@/lib/utils/nigerianStates'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

type SortField = 'case_number' | 'date_reported' | 'severity' | 'status'
type SortOrder = 'asc' | 'desc'

function CasesContent() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date_reported')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Lookups
  const {
    [LOOKUP_CATEGORIES.CASE_STATUS]: caseStatusLookup,
    [LOOKUP_CATEGORIES.CASE_SEVERITY]: caseSeverityLookup,
    [LOOKUP_CATEGORIES.CASE_TYPE]: caseTypeLookup,
    [LOOKUP_CATEGORIES.INTAKE_CHANNEL]: intakeChannelLookup,
    [LOOKUP_CATEGORIES.REPORTER_TYPE]: reporterTypeLookup,
    [LOOKUP_CATEGORIES.RISK_FLAG]: riskFlagLookup,
    [LOOKUP_CATEGORIES.PLATFORM]: platformLookup,
  } = useLookups([
    LOOKUP_CATEGORIES.CASE_STATUS,
    LOOKUP_CATEGORIES.CASE_SEVERITY,
    LOOKUP_CATEGORIES.CASE_TYPE,
    LOOKUP_CATEGORIES.INTAKE_CHANNEL,
    LOOKUP_CATEGORIES.REPORTER_TYPE,
    LOOKUP_CATEGORIES.RISK_FLAG,
    LOOKUP_CATEGORIES.PLATFORM,
  ])


  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const totalSteps = 5

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState<{ id: string; case_number: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: 'FRAUD',
    severity: 3,
    status: 'OPEN',
    date_reported: new Date().toISOString().slice(0, 16), // datetime-local format
    local_or_international: 'LOCAL',
    originating_country: 'NG', // Default to Nigeria
    cooperating_countries: [] as string[],
    // Risk flags and metadata
    risk_flags: [] as string[],
    platforms_implicated: [] as string[],
    lga_state_location: '',
    reporter_type: 'ANONYMOUS',
    reporter_name: '',
    reporter_contact: {
      phone: '',
      email: '',
    },
    intake_channel: 'WALK_IN',
    incident_datetime: '',
  })

  const handleModalOpen = () => {
    setIsModalOpen(true)
    setModalStep(1)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setModalStep(1)
    // Reset form
    setFormData({
      title: '',
      description: '',
      case_type: 'FRAUD',
      severity: 3,
      status: 'OPEN',
      date_reported: new Date().toISOString().slice(0, 16),
      local_or_international: 'LOCAL',
      originating_country: 'NG',
      cooperating_countries: [],
      // Risk flags and metadata
      risk_flags: [],
      platforms_implicated: [],
      lga_state_location: '',
      reporter_type: 'ANONYMOUS',
      reporter_name: '',
      reporter_contact: {
        phone: '',
        email: '',
      },
      intake_channel: 'WALK_IN',
      incident_datetime: '',
    })
  }

  const handleNext = () => {
    if (modalStep < totalSteps) {
      setModalStep(modalStep + 1)
    }
  }

  const handlePrevious = () => {
    if (modalStep > 1) {
      setModalStep(modalStep - 1)
    }
  }

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Case mutations hook
  const { createCase, deleteCase } = useCaseMutations()

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = 'Case title is required'
    } else if (formData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters'
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters'
    }

    if (formData.reporter_type !== 'ANONYMOUS' && !formData.reporter_name.trim()) {
      errors.reporter_name = 'Reporter name is required for non-anonymous reports'
    }

    if (formData.reporter_contact.email && !formData.reporter_contact.email.includes('@')) {
      errors.reporter_email = 'Invalid email format'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      console.error('Form validation failed:', formErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Transform form data to API format
      const apiData: CreateCaseData = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        case_type: formData.case_type,  // Include case type in submission
        status: formData.status,  // Include initial status in submission
        date_reported: formData.date_reported,
        local_or_international: formData.local_or_international as 'LOCAL' | 'INTERNATIONAL',
        originating_country: formData.originating_country || DEFAULT_COUNTRY_CODE,
        cooperating_countries: formData.cooperating_countries,
        // Intake fields
        intake_channel: formData.intake_channel as any,
        risk_flags: formData.risk_flags,
        platforms_implicated: formData.platforms_implicated,
        lga_state_location: formData.lga_state_location || undefined,
        incident_datetime: formData.incident_datetime || undefined,
        // Reporter fields
        reporter_type: formData.reporter_type as any,
        reporter_name: formData.reporter_name || undefined,
        reporter_contact: (formData.reporter_contact.phone || formData.reporter_contact.email)
          ? formData.reporter_contact
          : undefined,
      }

      console.log('Submitting case to API:', apiData)

      const result = await createCase(apiData)

      if (result) {
        console.log('Case created successfully:', result)
        handleModalClose()
        refetch()
      } else {
        setSubmitError('Failed to create case. Please try again.')
      }
    } catch (err) {
      console.error('Error creating case:', err)
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions for multi-select fields
  const toggleRiskFlag = (flag: string) => {
    setFormData((prev) => {
      const flags = prev.risk_flags || []
      if (flags.includes(flag)) {
        return { ...prev, risk_flags: flags.filter((f) => f !== flag) }
      } else {
        return { ...prev, risk_flags: [...flags, flag] }
      }
    })
  }

  const togglePlatform = (platform: string) => {
    setFormData((prev) => {
      const platforms = prev.platforms_implicated || []
      if (platforms.includes(platform)) {
        return { ...prev, platforms_implicated: platforms.filter((p) => p !== platform) }
      } else {
        return { ...prev, platforms_implicated: [...platforms, platform] }
      }
    })
  }

  // Delete case handlers
  const handleDeleteClick = (e: React.MouseEvent, caseItem: { id: string; case_number: string; title: string }) => {
    e.preventDefault()
    e.stopPropagation()
    setCaseToDelete(caseItem)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteCase(caseToDelete.id)
      if (success) {
        setDeleteModalOpen(false)
        setCaseToDelete(null)
        refetch()
      }
    } catch (error) {
      console.error('Failed to delete case:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setCaseToDelete(null)
  }

  // Fetch cases from API
  const { cases, total, loading, error, refetch } = useCases()

  // Debug logging
  console.log('Cases data:', { cases, total, loading, error, casesLength: cases?.length })

  // Client-side filtering, sorting, and pagination
  const filteredAndSortedCases = useMemo(() => {
    if (!cases) return []

    const filtered = cases.filter((caseItem) => {
      const matchesSearch =
        !search ||
        caseItem.case_number.toLowerCase().includes(search.toLowerCase()) ||
        caseItem.title.toLowerCase().includes(search.toLowerCase()) ||
        caseItem.description?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter
      const matchesSeverity =
        severityFilter === 'all' || caseItem.severity === parseInt(severityFilter)

      return matchesSearch && matchesStatus && matchesSeverity
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'date_reported') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [cases, search, statusFilter, severityFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCases.length / itemsPerPage)
  const paginatedCases = filteredAndSortedCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getSeverityBadge = (severity: number) => {
    // Try to find in lookup
    const found = caseSeverityLookup.values.find(v => v.value === severity.toString())
    if (found) {
      return {
        label: found.label,
        color: found.color || undefined,
        variant: 'default'
      }
    }

    const map: Record<number, { variant: any; label: string; color?: string }> = {
      5: { variant: 'critical', label: 'Critical', color: '#EF4444' },
      4: { variant: 'high', label: 'High', color: '#F97316' },
      3: { variant: 'medium', label: 'Medium', color: '#F59E0B' },
      2: { variant: 'low', label: 'Low', color: '#3B82F6' },
      1: { variant: 'default', label: 'Minimal', color: '#6B7280' },
    }
    return map[severity] || map[3]
  }

  const getStatusBadge = (status: string) => {
    // Try to find in lookup
    const found = caseStatusLookup.values.find(v => v.value === status)
    if (found) {
      return {
        label: found.label,
        color: found.color || undefined,
        variant: 'default'
      }
    }

    const map: Record<string, { variant: any; label: string; color?: string }> = {
      OPEN: { variant: 'info', label: 'Open', color: '#3B82F6' },
      UNDER_INVESTIGATION: { variant: 'warning', label: 'Investigating', color: '#F59E0B' },
      PENDING_PROSECUTION: { variant: 'warning', label: 'Pending', color: '#8B5CF6' },
      IN_COURT: { variant: 'info', label: 'In Court', color: '#EC4899' },
      CLOSED: { variant: 'default', label: 'Closed', color: '#10B981' },
      ARCHIVED: { variant: 'default', label: 'Archived', color: '#6B7280' },
    }
    return map[status] || { variant: 'default', label: status }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-slate-200 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Cases</h3>
            <p className="text-red-700 mb-4">{error.message}</p>
            <Button onClick={refetch} variant="outline">Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
              Case Management
            </h1>
            <p className="text-lg text-slate-600">
              Track and manage criminal investigations across all jurisdictions
            </p>
          </div>
          <Button
            onClick={handleModalOpen}
            className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Case
          </Button>
        </div>
      </div>

      {/* Premium Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by case number, title, or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            {caseStatusLookup.values.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="all">All Severities</option>
            {caseSeverityLookup.values.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(statusFilter !== 'all' || severityFilter !== 'all' || search) && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Active filters:</span>
            {statusFilter !== 'all' && (
              <span
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors"
              >
                Status: {statusFilter}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
            {severityFilter !== 'all' && (
              <span
                onClick={() => setSeverityFilter('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-amber-100 transition-colors"
              >
                Severity: Level {severityFilter}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
            {search && (
              <span
                onClick={() => setSearch('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-200 transition-colors"
              >
                Search: "{search}"
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('all')
                setSeverityFilter('all')
                setSearch('')
              }}
              className="ml-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results Count and Sort */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-900">
            {filteredAndSortedCases.length} {filteredAndSortedCases.length === 1 ? 'Case' : 'Cases'}
          </p>
          <span className="text-sm text-slate-500">
            Showing {paginatedCases.length} of {filteredAndSortedCases.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="date_reported">Date Reported</option>
            <option value="case_number">Case Number</option>
            <option value="severity">Severity</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sortOrder === 'asc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Premium Cases Grid */}
      <div className="space-y-3">
        {paginatedCases.map((case_) => {
          const severityInfo = getSeverityBadge(case_.severity)
          const statusInfo = getStatusBadge(case_.status)

          return (
            <Link key={case_.id} href={`/cases/${case_.id}`}>
              <div className="group bg-white rounded-2xl border border-slate-200/60 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="flex items-start gap-6 p-6">
                  {/* Severity Indicator */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-1.5 h-20 rounded-full"
                      style={{ backgroundColor: severityInfo.color || '#F59E0B' }}
                    ></div>
                  </div>

                  {/* Case Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {case_.case_number}
                          </h3>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold border"
                            style={{
                              backgroundColor: (statusInfo.color || '#3B82F6') + '20',
                              color: statusInfo.color || '#3B82F6',
                              borderColor: (statusInfo.color || '#3B82F6') + '40'
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-slate-900 font-medium mb-2 line-clamp-1">{case_.title}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteClick(e, { id: case_.id, case_number: case_.case_number, title: case_.title })}
                          className="p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete case"
                        >
                          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        {/* View Arrow */}
                        <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Meta Information */}
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(case_.date_reported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{case_.lead_investigator}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-semibold">{getSeverityBadge(case_.severity).label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filteredAndSortedCases.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No cases found</h3>
            <p className="text-slate-600 mb-6">
              {search || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
                : 'Get started by creating your first case to begin tracking investigations.'}
            </p>
            <Button
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
              onClick={handleModalOpen}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Case
            </Button>
          </div>
        </div>
      )}

      {/* Premium Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              if (totalPages <= 7) return i + 1
              if (currentPage <= 4) return i + 1
              if (currentPage >= totalPages - 3) return totalPages - 6 + i
              return currentPage - 3 + i
            }).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[2.75rem] h-11 rounded-lg font-semibold transition-all ${page === currentPage
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Premium Multi-Step Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={handleModalClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
              {/* Modal Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleModalClose}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Create New Case</h2>
                    <p className="text-slate-600 mt-1">Fill in the details to open a new investigation</p>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === modalStep
                          ? 'bg-slate-900 text-white shadow-lg'
                          : step < modalStep
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                          }`}>
                          {step < modalStep ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-semibold uppercase tracking-wide ${step === modalStep ? 'text-slate-900' : 'text-slate-400'
                            }`}>
                            {step === 1 && 'Info'}
                            {step === 2 && 'Intake'}
                            {step === 3 && 'Reporter'}
                            {step === 4 && 'Scope'}
                            {step === 5 && 'Summary'}
                          </div>
                        </div>
                      </div>
                      {step < 5 && (
                        <div className={`h-0.5 w-full mx-2 transition-colors ${step < modalStep ? 'bg-green-500' : 'bg-slate-200'
                          }`}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-8 max-h-[60vh] overflow-y-auto">
                {/* Submit Error Alert */}
                {submitError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-red-800">Error Creating Case</h4>
                        <p className="text-sm text-red-700 mt-1">{submitError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Case Information */}
                {modalStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Case Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value })
                          if (formErrors.title) {
                            setFormErrors({ ...formErrors, title: '' })
                          }
                        }}
                        placeholder="Enter a descriptive case title"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all ${formErrors.title ? 'border-red-500 bg-red-50' : 'border-slate-300'
                          }`}
                      />
                      {formErrors.title && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value })
                          if (formErrors.description) {
                            setFormErrors({ ...formErrors, description: '' })
                          }
                        }}
                        placeholder="Provide detailed information about the case"
                        rows={4}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none ${formErrors.description ? 'border-red-500 bg-red-50' : 'border-slate-300'
                          }`}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <DateTimePicker
                          label="Date & Time Reported"
                          value={formData.date_reported}
                          onChange={(value) => setFormData({ ...formData, date_reported: value })}
                          required
                          placeholder="Select date and time"
                          maxDate={new Date()}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Initial Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          {caseStatusLookup.values.map((v) => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Case Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.case_type}
                          onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="">Select Type</option>
                          {caseTypeLookup.values.map((v) => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Severity Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={String(formData.severity || 3)}
                          onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) || 3 })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          {caseSeverityLookup.values.map((v) => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Intake & Risk Flags */}
                {modalStep === 2 && (
                  <div className="space-y-6">
                    {/* Intake Channel, State Location, Incident Date/Time - all in one row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Intake Channel <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.intake_channel}
                          onChange={(e) => setFormData({ ...formData, intake_channel: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          {intakeChannelLookup.values.map((v) => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          State Location
                        </label>
                        <select
                          value={formData.lga_state_location}
                          onChange={(e) => setFormData({ ...formData, lga_state_location: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="">Select State</option>
                          {NIGERIAN_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <DateTimePicker
                          label="Incident Date/Time"
                          value={formData.incident_datetime}
                          onChange={(value) => setFormData({ ...formData, incident_datetime: value })}
                          placeholder="Select incident date and time"
                          maxDate={new Date()}
                        />
                      </div>
                    </div>

                    {/* Risk Flags */}
                    <div className="border-t border-slate-200 pt-6">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Risk Flags
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {riskFlagLookup.values.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => toggleRiskFlag(item.value)}
                            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${formData.risk_flags?.includes(item.value)
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                            style={formData.risk_flags?.includes(item.value) && item.color ? {
                              backgroundColor: item.color,
                              borderColor: item.color
                            } : {}}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Platforms Implicated */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Platforms Implicated
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {platformLookup.values.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => togglePlatform(item.value)}
                            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${formData.platforms_implicated?.includes(item.value)
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Reporter Information */}
                {modalStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Reporter Type
                      </label>
                      <select
                        value={formData.reporter_type}
                        onChange={(e) => setFormData({ ...formData, reporter_type: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                      >
                        {reporterTypeLookup.values.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.reporter_type !== 'ANONYMOUS' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Reporter Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.reporter_name}
                            onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                            placeholder="Full name of reporter"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Reporter Phone
                            </label>
                            <input
                              type="tel"
                              value={formData.reporter_contact.phone}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  reporter_contact: { ...formData.reporter_contact, phone: e.target.value },
                                })
                              }
                              placeholder="+234..."
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Reporter Email
                            </label>
                            <input
                              type="email"
                              value={formData.reporter_contact.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  reporter_contact: { ...formData.reporter_contact, email: e.target.value },
                                })
                              }
                              placeholder="email@example.com"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Case Scope */}
                {modalStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Case Scope <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setFormData({ ...formData, local_or_international: 'LOCAL' })}
                          className={`px-6 py-4 rounded-xl border-2 font-semibold transition-all ${formData.local_or_international === 'LOCAL'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Local
                          </div>
                        </button>
                        <button
                          onClick={() => setFormData({ ...formData, local_or_international: 'INTERNATIONAL' })}
                          className={`px-6 py-4 rounded-xl border-2 font-semibold transition-all ${formData.local_or_international === 'INTERNATIONAL'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            International
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Originating Country
                      </label>
                      <select
                        value={formData.originating_country}
                        onChange={(e) => setFormData({ ...formData, originating_country: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.local_or_international === 'INTERNATIONAL' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Cooperating Countries
                        </label>
                        <select
                          multiple
                          value={formData.cooperating_countries}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value)
                            setFormData({ ...formData, cooperating_countries: selected })
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white min-h-[120px]"
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-sm text-slate-500">Hold Ctrl/Cmd to select multiple countries</p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-1">International Cooperation</h4>
                          <p className="text-sm text-blue-700">For international cases, ensure proper coordination protocols are followed and relevant authorities are notified.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Case Summary */}
                {modalStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Ready to Submit</h4>
                          <p className="text-sm text-green-700">Review the case details below before submitting. Parties can be added after the case is created.</p>
                        </div>
                      </div>
                    </div>

                    {/* Full Case Summary */}
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Case Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* Basic Info */}
                        <div className="col-span-2 pb-4 border-b border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Basic Information</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Title:</span>
                          <span className="font-semibold text-slate-900 text-right max-w-[200px] truncate">{formData.title || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Case Type:</span>
                          <span className="font-semibold text-slate-900">{caseTypeLookup.values.find(v => v.value === formData.case_type)?.label || formData.case_type || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Severity:</span>
                          <span className="font-semibold text-slate-900">Level {formData.severity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Initial Status:</span>
                          <span className="font-semibold text-slate-900">{caseStatusLookup.values.find(v => v.value === formData.status)?.label || formData.status || 'Open'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-600">Date Reported:</span>
                          <span className="font-semibold text-slate-900">{formData.date_reported ? new Date(formData.date_reported).toLocaleString() : 'Not set'}</span>
                        </div>

                        {/* Intake Details */}
                        <div className="col-span-2 pt-4 pb-4 border-b border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Intake Details</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Intake Channel:</span>
                          <span className="font-semibold text-slate-900">{intakeChannelLookup.values.find(v => v.value === formData.intake_channel)?.label || formData.intake_channel || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">State Location:</span>
                          <span className="font-semibold text-slate-900">{formData.lga_state_location || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-600">Risk Flags:</span>
                          <span className="font-semibold text-slate-900">{formData.risk_flags?.length > 0 ? formData.risk_flags.join(', ') : 'None'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-600">Platforms:</span>
                          <span className="font-semibold text-slate-900">{formData.platforms_implicated?.length > 0 ? formData.platforms_implicated.join(', ') : 'None'}</span>
                        </div>

                        {/* Reporter Info */}
                        <div className="col-span-2 pt-4 pb-4 border-b border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reporter Information</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Reporter Type:</span>
                          <span className="font-semibold text-slate-900">{reporterTypeLookup.values.find(v => v.value === formData.reporter_type)?.label || formData.reporter_type || 'Anonymous'}</span>
                        </div>
                        {formData.reporter_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Reporter Name:</span>
                            <span className="font-semibold text-slate-900">{formData.reporter_name}</span>
                          </div>
                        )}

                        {/* Scope */}
                        <div className="col-span-2 pt-4 pb-4 border-b border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Case Scope</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Scope:</span>
                          <span className="font-semibold text-slate-900">{formData.local_or_international}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Country:</span>
                          <span className="font-semibold text-slate-900">{COUNTRIES.find(c => c.code === formData.originating_country)?.name || formData.originating_country || 'Nigeria'}</span>
                        </div>
                        {formData.cooperating_countries?.length > 0 && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-600">Cooperating Countries:</span>
                            <span className="font-semibold text-slate-900">{formData.cooperating_countries.map(c => COUNTRIES.find(co => co.code === c)?.name || c).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-amber-900 mb-1">Next Steps</h4>
                          <p className="text-sm text-amber-700">After creating this case, you can add parties (suspects, victims, witnesses), upload evidence, and assign investigators.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-between items-center">
                <div>
                  {modalStep > 1 && (
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </Button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleModalClose}
                  >
                    Cancel
                  </Button>

                  {modalStep < totalSteps ? (
                    <Button
                      onClick={handleNext}
                      disabled={!formData.title || !formData.description}
                      className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.title || !formData.description || isSubmitting}
                      className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Create Case
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && caseToDelete && (
        <>
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-200"
            onClick={handleDeleteCancel}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-200 scale-100 opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with danger icon */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Delete Case?</h3>
                    <p className="text-sm text-slate-500 mt-1">Case #{caseToDelete.case_number}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pb-4">
                <p className="text-slate-700 mb-3">
                  Are you sure you want to delete the case <span className="font-semibold text-slate-900">"{caseToDelete.title}"</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-800">
                      <strong>This action is irreversible and cannot be undone.</strong> All associated evidence, parties, tasks, and attachments will also be removed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer with actions */}
              <div className="px-6 pb-6 flex items-center justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Case
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

export default function CasesPage() {
  return (
    <ProtectedRoute requireAuth requiredPermissions={['cases:view']}>
      <CasesContent />
    </ProtectedRoute>
  )
}
