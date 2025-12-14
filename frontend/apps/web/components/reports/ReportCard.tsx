'use client'

import { Report, REPORT_TYPES } from '@/lib/hooks/useReports'
import { format } from 'date-fns'

interface ReportCardProps {
    report: Report
    onDownload: (id: string) => void
    onDelete: (id: string) => void
    isDeleting?: boolean
}

const STATUS_STYLES = {
    PENDING: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: '⏳'
    },
    PROCESSING: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: '🔄'
    },
    COMPLETED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: '✓'
    },
    FAILED: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: '✗'
    },
    CANCELLED: {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        icon: '—'
    }
}

const FORMAT_ICONS: Record<string, { icon: string; gradient: string }> = {
    PDF: { icon: '📄', gradient: 'from-red-500 to-rose-600' },
    EXCEL: { icon: '📊', gradient: 'from-emerald-500 to-green-600' },
    CSV: { icon: '📋', gradient: 'from-blue-500 to-indigo-600' }
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateSafe(dateStr?: string): string {
    if (!dateStr) return '—'
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return '—'
        return format(date, 'MMM d, yyyy')
    } catch {
        return '—'
    }
}

function formatDateTimeSafe(dateStr?: string): string | null {
    if (!dateStr) return null
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        return format(date, 'MMM d, yyyy h:mm a')
    } catch {
        return null
    }
}

export function ReportCard({ report, onDownload, onDelete, isDeleting }: ReportCardProps) {
    const reportTypeInfo = REPORT_TYPES.find(t => t.value === report.report_type)
    const statusStyle = STATUS_STYLES[report.export_format as keyof typeof STATUS_STYLES] || STATUS_STYLES.PENDING
    const formatInfo = FORMAT_ICONS[report.export_format] || FORMAT_ICONS.PDF

    // Determine status from generated_at - if exists, completed
    const status = report.generated_at ? 'COMPLETED' : 'PENDING'
    const currentStatusStyle = STATUS_STYLES[status]

    return (
        <div className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            {/* Background Decoration */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${formatInfo.gradient} opacity-5 rounded-2xl`} />

            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Format Icon */}
                        <div className={`p-3 bg-gradient-to-br ${formatInfo.gradient} rounded-xl shadow-lg`}>
                            <span className="text-xl text-white">{formatInfo.icon}</span>
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900">
                                {reportTypeInfo?.label || report.report_type}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {report.title || `${report.report_type} Report`}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${currentStatusStyle.bg} ${currentStatusStyle.text} ${currentStatusStyle.border} border`}>
                        <span>{currentStatusStyle.icon}</span>
                        {status}
                    </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                    {(report.date_range_start || report.date_range_end) && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                                {formatDateSafe(report.date_range_start)} — {formatDateSafe(report.date_range_end)}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                            {formatDateTimeSafe(report.generated_at)
                                ? `Generated ${formatDateTimeSafe(report.generated_at)}`
                                : 'Generation pending...'
                            }
                        </span>
                    </div>

                    {report.file_size && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{formatFileSize(report.file_size)} • {report.export_format}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    {status === 'COMPLETED' && report.download_url && (
                        <button
                            onClick={() => onDownload(report.id)}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                    )}

                    {status === 'PENDING' && (
                        <div className="flex-1 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </div>
                    )}

                    <button
                        onClick={() => onDelete(report.id)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Delete Report"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
