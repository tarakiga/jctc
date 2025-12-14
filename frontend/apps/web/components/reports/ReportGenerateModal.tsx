'use client'

import { useState } from 'react'
import { REPORT_TYPES, EXPORT_FORMATS, ExportFormat, ReportType } from '@/lib/hooks/useReports'

interface ReportGenerateModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (data: {
        report_type: ReportType
        date_range_start: string
        date_range_end: string
        export_format: ExportFormat
    }) => Promise<void>
    isGenerating: boolean
}

export function ReportGenerateModal({
    isOpen,
    onClose,
    onGenerate,
    isGenerating
}: ReportGenerateModalProps) {
    const [reportType, setReportType] = useState<ReportType>('MONTHLY_OPERATIONS')
    const [exportFormat, setExportFormat] = useState<ExportFormat>('PDF')
    const [dateRangeStart, setDateRangeStart] = useState(() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1)
        return date.toISOString().split('T')[0]
    })
    const [dateRangeEnd, setDateRangeEnd] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleGenerate = async () => {
        setError(null)

        if (new Date(dateRangeStart) > new Date(dateRangeEnd)) {
            setError('Start date must be before end date')
            return
        }

        try {
            await onGenerate({
                report_type: reportType,
                date_range_start: dateRangeStart,
                date_range_end: dateRangeEnd,
                export_format: exportFormat
            })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate report')
        }
    }

    const selectedReportType = REPORT_TYPES.find(t => t.value === reportType)

    return (
        <>
            {/* Backdrop with glassmorphism */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scaleIn">
                <div
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Generate New Report</h2>
                                <p className="text-emerald-100 text-sm mt-1">Configure and generate a custom report</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Error Alert */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Report Type Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-900">Report Type</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {REPORT_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setReportType(type.value as ReportType)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${reportType === type.value
                                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <p className={`font-semibold text-sm ${reportType === type.value ? 'text-emerald-700' : 'text-slate-900'
                                            }`}>
                                            {type.label}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-900">Start Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateRangeStart}
                                        onChange={e => setDateRangeStart(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-900">End Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateRangeEnd}
                                        onChange={e => setDateRangeEnd(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Export Format */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-900">Export Format</label>
                            <div className="flex gap-3">
                                {EXPORT_FORMATS.map(format => (
                                    <button
                                        key={format.value}
                                        type="button"
                                        onClick={() => setExportFormat(format.value as ExportFormat)}
                                        className={`flex-1 p-4 rounded-xl border-2 text-center transition-all duration-200 ${exportFormat === format.value
                                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="text-2xl mb-2 block">{format.icon}</span>
                                        <p className={`font-semibold text-sm ${exportFormat === format.value ? 'text-emerald-700' : 'text-slate-900'
                                            }`}>
                                            {format.label}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Report Info */}
                        {selectedReportType && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{selectedReportType.label}</p>
                                        <p className="text-sm text-slate-600 mt-1">{selectedReportType.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isGenerating}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Generate Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS for animations */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
        </>
    )
}
