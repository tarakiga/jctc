'use client'

import { useState } from 'react'
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'
import { useCompliance, useComplianceAssessment, ComplianceViolation, DSRRequest, BreachNotification } from '@/lib/hooks/useCompliance'
import { format, formatDistanceToNow } from 'date-fns'

// Compliance score colors
function getScoreColor(score: number) {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-amber-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
}

function getScoreBg(score: number) {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 70) return 'bg-amber-500'
    if (score >= 50) return 'bg-orange-500'
    return 'bg-red-500'
}

function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
        COMPLIANT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        MINOR_ISSUES: 'bg-amber-100 text-amber-800 border-amber-200',
        MAJOR_VIOLATIONS: 'bg-orange-100 text-orange-800 border-orange-200',
        CRITICAL_VIOLATIONS: 'bg-red-100 text-red-800 border-red-200',
        NOT_ASSESSED: 'bg-slate-100 text-slate-600 border-slate-200',
    }
    return styles[status] || styles.NOT_ASSESSED
}

function getSeverityBadge(severity: string) {
    const styles: Record<string, string> = {
        LOW: 'bg-blue-100 text-blue-700',
        MEDIUM: 'bg-amber-100 text-amber-700',
        HIGH: 'bg-orange-100 text-orange-700',
        CRITICAL: 'bg-red-100 text-red-700',
    }
    return styles[severity] || 'bg-slate-100 text-slate-600'
}

function getDSRStatusBadge(status: string) {
    const styles: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-700',
        IN_PROGRESS: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-700',
    }
    return styles[status] || 'bg-slate-100 text-slate-600'
}

// Stat Card Component
function StatCard({ icon, label, value, subValue, trend, color = 'slate' }: {
    icon: React.ReactNode
    label: string
    value: string | number
    subValue?: string
    trend?: 'up' | 'down' | 'neutral'
    color?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate' | 'purple'
}) {
    const colorClasses = {
        emerald: 'from-emerald-500 to-emerald-600',
        amber: 'from-amber-500 to-amber-600',
        red: 'from-red-500 to-red-600',
        blue: 'from-blue-500 to-blue-600',
        slate: 'from-slate-500 to-slate-600',
        purple: 'from-purple-500 to-purple-600',
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-slate-500 font-medium">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{value}</span>
                        {subValue && <span className="text-sm text-slate-400">{subValue}</span>}
                    </div>
                </div>
                {trend && (
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                        trend === 'down' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
                    </div>
                )}
            </div>
        </div>
    )
}

// Violation Row Component
function ViolationRow({ violation }: { violation: ComplianceViolation }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <div className={`w-2 h-12 rounded-full ${violation.severity === 'CRITICAL' ? 'bg-red-500' :
                violation.severity === 'HIGH' ? 'bg-orange-500' :
                    violation.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{violation.violation_type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-500 truncate">{violation.description}</p>
            </div>
            <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadge(violation.severity)}`}>
                    {violation.severity}
                </span>
                {violation.ndpa_article && (
                    <span className="text-xs text-slate-400">Art. {violation.ndpa_article}</span>
                )}
            </div>
        </div>
    )
}

// DSR Row Component
function DSRRow({ request }: { request: DSRRequest }) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${request.is_overdue ? 'bg-red-50 border border-red-200' : 'bg-slate-50 hover:bg-slate-100'
            }`}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{request.data_subject_name}</p>
                <p className="text-sm text-slate-500">{request.request_type} Request</p>
            </div>
            <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDSRStatusBadge(request.status)}`}>
                    {request.status}
                </span>
                {request.is_overdue ? (
                    <p className="text-xs text-red-600 mt-1 font-medium">OVERDUE</p>
                ) : (
                    <p className="text-xs text-slate-400 mt-1">Due {formatDistanceToNow(new Date(request.due_date), { addSuffix: true })}</p>
                )}
            </div>
        </div>
    )
}

// Breach Row Component
function BreachRow({ breach }: { breach: BreachNotification }) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl ${breach.status !== 'RESOLVED' ? 'bg-red-50 border border-red-100' : 'bg-slate-50'
            }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${breach.severity === 'CRITICAL' ? 'bg-red-100' :
                breach.severity === 'HIGH' ? 'bg-orange-100' : 'bg-amber-100'
                }`}>
                <svg className={`w-5 h-5 ${breach.severity === 'CRITICAL' ? 'text-red-600' :
                    breach.severity === 'HIGH' ? 'text-orange-600' : 'text-amber-600'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{breach.breach_type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-500">{breach.subjects_affected_count} subjects affected</p>
            </div>
            <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadge(breach.severity)}`}>
                    {breach.severity}
                </span>
                <div className="flex items-center gap-1">
                    {breach.nitda_notified ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center" title="NITDA Notified">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                    ) : (
                        <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center" title="NITDA Not Notified">
                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// Main Content
function ComplianceContent() {
    const {
        dashboard,
        isDashboardLoading,
        dashboardError,
        violations,
        isViolationsLoading,
        dsrRequests,
        isDSRLoading,
        breaches,
        isBreachesLoading,
        summaryStats,
        refreshAll,
    } = useCompliance()

    const { runAssessment, isAssessing } = useComplianceAssessment()
    const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'dsr' | 'breaches'>('overview')

    // Mock data for when backend is not connected
    const mockScore = 78
    const mockStatus = 'MINOR_ISSUES'

    const score = dashboard?.status?.compliance_score ?? mockScore
    const status = dashboard?.status?.overall_status ?? mockStatus

    if (isDashboardLoading && isViolationsLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">NDPA Compliance</h1>
                    <p className="text-slate-500 mt-1">Nigeria Data Protection Act compliance dashboard</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refreshAll()}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={() => runAssessment()}
                        disabled={isAssessing}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isAssessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Assessing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Run Assessment
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Compliance Score Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusBadge(status)}`}>
                                {status.replace(/_/g, ' ')}
                            </span>
                            {dashboard?.status?.last_assessment && (
                                <span className="text-sm text-slate-400">
                                    Last assessed {formatDistanceToNow(new Date(dashboard.status.last_assessment), { addSuffix: true })}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg text-slate-300 font-medium mb-1">Overall Compliance Score</h2>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-7xl font-bold ${getScoreColor(score)}`}>{score}</span>
                            <span className="text-2xl text-slate-400">/100</span>
                        </div>
                        <div className="mt-4 w-64 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${getScoreBg(score)}`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                            <p className="text-slate-400 text-sm">Open Violations</p>
                            <p className="text-3xl font-bold text-white">{summaryStats.openViolations}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                            <p className="text-slate-400 text-sm">Critical Issues</p>
                            <p className="text-3xl font-bold text-red-400">{summaryStats.criticalViolations}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                            <p className="text-slate-400 text-sm">Pending DSRs</p>
                            <p className="text-3xl font-bold text-amber-400">{summaryStats.pendingDSRs}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                            <p className="text-slate-400 text-sm">Open Breaches</p>
                            <p className="text-3xl font-bold text-orange-400">{summaryStats.openBreaches}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    {
                        id: 'overview', label: 'Overview', icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        )
                    },
                    {
                        id: 'violations', label: 'Violations', icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )
                    },
                    {
                        id: 'dsr', label: 'DSR Requests', icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )
                    },
                    {
                        id: 'breaches', label: 'Breaches', icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        )
                    },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Violations */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Recent Violations</h3>
                            <button
                                onClick={() => setActiveTab('violations')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                View All →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {violations.slice(0, 5).map((v) => (
                                <ViolationRow key={v.id} violation={v} />
                            ))}
                            {violations.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>No violations found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending DSR Requests */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Pending DSR Requests</h3>
                            <button
                                onClick={() => setActiveTab('dsr')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                View All →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {dsrRequests.filter(d => d.status !== 'COMPLETED').slice(0, 5).map((d) => (
                                <DSRRow key={d.id} request={d} />
                            ))}
                            {dsrRequests.filter(d => d.status !== 'COMPLETED').length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>No pending requests</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Breaches */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Data Breaches</h3>
                            <button
                                onClick={() => setActiveTab('breaches')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                View All →
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {breaches.slice(0, 4).map((b) => (
                                <BreachRow key={b.id} breach={b} />
                            ))}
                            {breaches.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <p>No data breaches reported</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'violations' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">All Compliance Violations</h3>
                    <div className="space-y-3">
                        {violations.map((v) => (
                            <ViolationRow key={v.id} violation={v} />
                        ))}
                        {violations.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-lg font-medium">No Violations Found</p>
                                <p className="text-sm">Your organization is in good compliance standing.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'dsr' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Subject Requests</h3>
                    <div className="space-y-3">
                        {dsrRequests.map((d) => (
                            <DSRRow key={d.id} request={d} />
                        ))}
                        {dsrRequests.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <p className="text-lg font-medium">No DSR Requests</p>
                                <p className="text-sm">No data subject rights requests have been submitted.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'breaches' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Breach Notifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {breaches.map((b) => (
                            <BreachRow key={b.id} breach={b} />
                        ))}
                        {breaches.length === 0 && (
                            <div className="col-span-2 text-center py-12 text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <p className="text-lg font-medium">No Data Breaches</p>
                                <p className="text-sm">No data breaches have been reported.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NDPA Reference Footer */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900">Nigeria Data Protection Act (NDPA) 2023</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            This dashboard helps ensure compliance with NDPA requirements including consent management,
                            data subject rights, breach notifications, and NITDA reporting obligations.
                        </p>
                        <div className="flex gap-4 mt-3">
                            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                View NDPA Guidelines →
                            </a>
                            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                NITDA Portal →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CompliancePage() {
    return (
        <AuthenticatedLayout>
            <ComplianceContent />
        </AuthenticatedLayout>
    )
}

