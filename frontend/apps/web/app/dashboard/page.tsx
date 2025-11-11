'use client'

import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import Link from 'next/link'
import { useCaseStats } from '@/lib/hooks/useCases'

function DashboardContent() {
  const { stats, loading, error } = useCaseStats()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-slate-200 rounded-2xl"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 animate-pulse">
            <div className="h-96 bg-slate-200 rounded-2xl"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-96 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

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
            <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Dashboard</h3>
            <p className="text-red-700">{error.message}</p>
            <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalCases = stats?.total || 0
  const activeCases = stats?.by_status?.UNDER_INVESTIGATION || 0
  const criticalCases = stats?.by_severity?.[5] || 0
  const recentCases = stats?.recent_cases || []

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}!
            </h2>
            <p className="text-slate-600 text-lg">
              Here's an overview of your case operations
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

        {/* Key Metrics - Premium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+12%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Cases</p>
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{totalCases}</p>
                <p className="text-xs text-slate-500 mt-2">Across all departments</p>
              </div>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Under Investigation</p>
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{activeCases}</p>
                <p className="text-xs text-slate-500 mt-2">Requires attention</p>
              </div>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Urgent
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Critical Cases</p>
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{criticalCases}</p>
                <p className="text-xs text-slate-500 mt-2">High priority items</p>
              </div>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Recent</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">This Month</p>
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{recentCases.length}</p>
                <p className="text-xs text-slate-500 mt-2">New submissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cases by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.by_status &&
                  Object.entries(stats.by_status).map(([status, count]) => {
                    const total = stats.total || 1
                    const percentage = Math.round((Number(count) / total) * 100)
                    const statusLabels: Record<string, { label: string; color: string }> = {
                      OPEN: { label: 'Open', color: 'bg-blue-500' },
                      UNDER_INVESTIGATION: { label: 'Investigating', color: 'bg-amber-500' },
                      PENDING_PROSECUTION: { label: 'Pending', color: 'bg-purple-500' },
                      IN_COURT: { label: 'In Court', color: 'bg-indigo-500' },
                      CLOSED: { label: 'Closed', color: 'bg-green-500' },
                      ARCHIVED: { label: 'Archived', color: 'bg-neutral-400' },
                    }
                    const statusInfo = statusLabels[status] || { label: status, color: 'bg-neutral-500' }
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-neutral-700">{statusInfo.label}</span>
                          <span className="text-sm text-neutral-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className={`${statusInfo.color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="primary" className="w-full justify-start" asChild>
                  <Link href="/cases/new">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Case
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/evidence/upload">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Evidence
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/cases">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Cases
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/evidence">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Evidence
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Cases</CardTitle>
              <Link href="/cases">
                <Button variant="ghost" size="sm">View All →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <div className="py-12 text-center text-neutral-600">No recent cases</div>
            ) : (
              <div className="space-y-4">
                {recentCases.slice(0, 5).map((caseItem: any) => (
                  <Link key={caseItem.id} href={`/cases/${caseItem.id}`} className="block">
                    <div className="flex items-center justify-between p-4 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-neutral-900">{caseItem.case_number}</span>
                          <Badge variant={caseItem.severity >= 4 ? 'critical' : 'default'}>
                            Severity {caseItem.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-700">{caseItem.title}</p>
                        <p className="text-xs text-neutral-500 mt-1">{new Date(caseItem.date_reported).toLocaleDateString()}</p>
                      </div>
                      <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardContent />
    </ProtectedRoute>
  )
}
