'use client'

import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { useReports, useScheduledReports, REPORT_TYPES, ReportType, Report } from '@/lib/hooks/useReports'
import { ReportGenerateModal, ReportCard, ReportFilters, DeleteConfirmModal, NotificationModal } from '@/components/reports'

function ReportsContent() {
  const { reports, isLoading, error, generateReport, deleteReport, isGenerating, isDeleting } = useReports()
  const { scheduledReports } = useScheduledReports()

  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)
  const [filterType, setFilterType] = useState<ReportType | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null)

  // Filter reports
  const filteredReports = useMemo(() => {
    let result = [...reports]

    if (filterType !== 'ALL') {
      result = result.filter(r => r.report_type === filterType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.report_type.toLowerCase().includes(query)
      )
    }

    return result
  }, [reports, filterType, searchQuery])

  // Statistics
  const stats = useMemo(() => {
    const completed = reports.filter(r => r.generated_at).length
    const pending = reports.filter(r => !r.generated_at).length
    return {
      total: reports.length,
      completed,
      pending,
      scheduled: scheduledReports.length
    }
  }, [reports, scheduledReports])

  const handleDownload = async (id: string) => {
    const report = reports.find(r => r.id === id)
    if (!report?.download_url) {
      setNotification({
        title: 'Download Unavailable',
        message: 'Download URL not available for this report.',
        type: 'warning'
      })
      return
    }

    // Build full backend URL for download - use env variable for production
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    // Remove /api/v1 suffix to get the base URL for downloads
    const baseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '')
    const downloadUrl = report.download_url.startsWith('http')
      ? report.download_url
      : `${baseUrl}${report.download_url}`

    // Get auth token and append to URL for direct download
    const token = localStorage.getItem('access_token')
    const urlWithToken = token ? `${downloadUrl}?token=${token}` : downloadUrl

    // Use hidden anchor tag to trigger download (avoids opening new tab)
    const link = document.createElement('a')
    link.href = urlWithToken
    link.download = '' // Let browser use filename from Content-Disposition
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setNotification({
      title: 'Download Started',
      message: 'Your report download has started. Check your downloads folder.',
      type: 'success'
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteReport(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete report:', err)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-slate-200 rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="animate-pulse">
            <div className="h-16 bg-slate-200 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-slate-200 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

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
              <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Reports</h3>
              <p className="text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
            <p className="text-slate-600 mt-1">Generate, view, and manage your reports</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Reports */}
        <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Reports</p>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Completed</p>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* Scheduled */}
        <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Scheduled</p>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{stats.scheduled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {REPORT_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => {
              setShowGenerateModal(true)
            }}
            className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 group-hover:bg-emerald-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-600 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">{type.label.replace(' Report', '')}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ReportFilters
          selectedType={filterType}
          onTypeChange={setFilterType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reports Found</h3>
          <p className="text-slate-600 mb-6">
            {searchQuery || filterType !== 'ALL'
              ? 'Try adjusting your filters or search query'
              : 'Generate your first report to get started'}
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Your First Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onDownload={handleDownload}
              onDelete={() => setDeleteTarget(report)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <ReportGenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={generateReport}
        isGenerating={isGenerating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.title || `${deleteTarget?.report_type} Report`}
        itemType="Report"
        isDeleting={isDeleting}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        title={notification?.title || ''}
        message={notification?.message || ''}
        type={notification?.type || 'info'}
      />
    </DashboardLayout>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute requireAuth requiredPermissions={['reports:view']}>
      <ReportsContent />
    </ProtectedRoute>
  )
}