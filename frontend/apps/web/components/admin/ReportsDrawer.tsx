'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@jctc/ui'
import { apiClient } from '@/lib/services/api-client'

// Icons
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const DocumentIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
)

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
)

const PlayIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const ChartIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
)

interface ReportsDrawerProps {
    isOpen: boolean
    onClose: () => void
}

interface ReportConfig {
    id: string
    name: string
    description: string
    icon: 'cases' | 'evidence' | 'users' | 'audit' | 'performance' | 'compliance'
    category: string
    params?: { label: string; key: string; type: 'date' | 'select' | 'text'; options?: string[] }[]
}

const REPORT_CONFIGS: ReportConfig[] = [
    {
        id: 'case_summary',
        name: 'Case Summary Report',
        description: 'Overview of all cases with status breakdown and trends',
        icon: 'cases',
        category: 'Cases',
        params: [
            { label: 'Start Date', key: 'start_date', type: 'date' },
            { label: 'End Date', key: 'end_date', type: 'date' },
            { label: 'Status', key: 'status', type: 'select', options: ['All', 'OPEN', 'CLOSED', 'UNDER_INVESTIGATION'] }
        ]
    },
    {
        id: 'case_aging',
        name: 'Case Aging Report',
        description: 'Cases by age with overdue highlights',
        icon: 'cases',
        category: 'Cases'
    },
    {
        id: 'evidence_chain',
        name: 'Chain of Custody Report',
        description: 'Complete chain of custody audit trail',
        icon: 'evidence',
        category: 'Evidence',
        params: [
            { label: 'Case Number', key: 'case_number', type: 'text' }
        ]
    },
    {
        id: 'user_activity',
        name: 'User Activity Report',
        description: 'User actions and login history',
        icon: 'users',
        category: 'Users',
        params: [
            { label: 'User', key: 'user_id', type: 'select', options: ['All Users'] },
            { label: 'Start Date', key: 'start_date', type: 'date' },
            { label: 'End Date', key: 'end_date', type: 'date' }
        ]
    },
    {
        id: 'audit_trail',
        name: 'Full Audit Trail',
        description: 'Complete system audit log export',
        icon: 'audit',
        category: 'Audit'
    },
    {
        id: 'performance_metrics',
        name: 'Performance Metrics',
        description: 'KPIs, resolution times, and team performance',
        icon: 'performance',
        category: 'Analytics'
    },
    {
        id: 'compliance',
        name: 'Compliance Report',
        description: 'Regulatory compliance status and violations',
        icon: 'compliance',
        category: 'Compliance'
    }
]

const ICON_MAP: Record<string, React.ReactNode> = {
    cases: <DocumentIcon />,
    evidence: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    audit: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    performance: <ChartIcon />,
    compliance: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
}

const CATEGORY_COLORS: Record<string, string> = {
    Cases: 'from-blue-500 to-blue-600',
    Evidence: 'from-amber-500 to-orange-500',
    Users: 'from-cyan-500 to-teal-500',
    Audit: 'from-purple-500 to-indigo-500',
    Analytics: 'from-emerald-500 to-green-500',
    Compliance: 'from-rose-500 to-pink-500'
}

export function ReportsDrawer({ isOpen, onClose }: ReportsDrawerProps) {
    const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null)
    const [generating, setGenerating] = useState(false)
    const [generatedReports, setGeneratedReports] = useState<Array<{ id: string, name: string, date: string, size: string }>>([])
    const [reportParams, setReportParams] = useState<Record<string, string>>({})

    const categories = [...new Set(REPORT_CONFIGS.map(r => r.category))]

    const handleGenerateReport = async () => {
        if (!selectedReport) return

        try {
            setGenerating(true)
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000))

            setGeneratedReports(prev => [{
                id: `${selectedReport.id}_${Date.now()}`,
                name: selectedReport.name,
                date: new Date().toISOString(),
                size: `${Math.floor(Math.random() * 500 + 100)} KB`
            }, ...prev])

            setSelectedReport(null)
        } catch (error) {
            console.error('Failed to generate report:', error)
        } finally {
            setGenerating(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Reports Center</h2>
                        <p className="text-emerald-100 text-sm">Generate and download system reports</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Report Templates */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Report Templates</h3>

                        {categories.map(category => (
                            <div key={category} className="mb-6">
                                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${CATEGORY_COLORS[category]}`}></span>
                                    {category}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {REPORT_CONFIGS.filter(r => r.category === category).map(report => (
                                        <button
                                            key={report.id}
                                            onClick={() => {
                                                setSelectedReport(report)
                                                setReportParams({})
                                            }}
                                            className={`p-4 rounded-xl border text-left transition-all ${selectedReport?.id === report.id
                                                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[category]} text-white`}>
                                                    {ICON_MAP[report.icon]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{report.name}</p>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{report.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Panel - Generate or History */}
                    <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col">
                        {selectedReport ? (
                            <>
                                <div className="p-4 border-b border-slate-200 bg-white">
                                    <h3 className="font-semibold text-slate-900">{selectedReport.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{selectedReport.description}</p>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto">
                                    {selectedReport.params && selectedReport.params.length > 0 ? (
                                        <div className="space-y-4">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parameters</p>
                                            {selectedReport.params.map(param => (
                                                <div key={param.key}>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">{param.label}</label>
                                                    {param.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            value={reportParams[param.key] || ''}
                                                            onChange={(e) => setReportParams({ ...reportParams, [param.key]: e.target.value })}
                                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                    ) : param.type === 'select' ? (
                                                        <select
                                                            value={reportParams[param.key] || ''}
                                                            onChange={(e) => setReportParams({ ...reportParams, [param.key]: e.target.value })}
                                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                                        >
                                                            <option value="">Select...</option>
                                                            {param.options?.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={reportParams[param.key] || ''}
                                                            onChange={(e) => setReportParams({ ...reportParams, [param.key]: e.target.value })}
                                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No parameters required for this report.</p>
                                    )}
                                </div>

                                <div className="p-4 border-t border-slate-200 bg-white">
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={generating}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                        {generating ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <PlayIcon />
                                                Generate Report
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setSelectedReport(null)}
                                        className="w-full mt-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 border-b border-slate-200 bg-white">
                                    <h3 className="font-semibold text-slate-900">Recent Reports</h3>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto">
                                    {generatedReports.length === 0 ? (
                                        <div className="text-center py-8">
                                            <DocumentIcon />
                                            <p className="mt-2 text-sm text-slate-500">No reports generated yet</p>
                                            <p className="text-xs text-slate-400">Select a template to get started</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {generatedReports.map(report => (
                                                <div key={report.id} className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">{report.name}</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {new Date(report.date).toLocaleDateString()} • {report.size}
                                                            </p>
                                                        </div>
                                                        <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                                                            <DownloadIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
