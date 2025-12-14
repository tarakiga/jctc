'use client'

import { useState, useMemo } from 'react'
import { useReports, REPORT_TYPES, ReportType, Report } from '@/lib/hooks/useReports'
import { ReportGenerateModal, ReportCard, DeleteConfirmModal } from '@/components/reports'

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

interface ReportsDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function ReportsDrawer({ isOpen, onClose }: ReportsDrawerProps) {
    const { reports, isLoading, generateReport, deleteReport, isGenerating, isDeleting } = useReports()
    const [showGenerateModal, setShowGenerateModal] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)

    const recentReports = useMemo(() => {
        return [...reports].slice(0, 5)
    }, [reports])

    const handleDownload = (id: string) => {
        const report = reports.find(r => r.id === id)
        if (report?.download_url) {
            window.open(report.download_url, '_blank')
        }
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

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col">
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
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Quick Generate Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Generate</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {REPORT_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setShowGenerateModal(true)}
                                    className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-200 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 group-hover:bg-emerald-100 rounded-lg transition-colors">
                                            <svg className="w-5 h-5 text-slate-600 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 block">{type.label.replace(' Report', '')}</span>
                                            <span className="text-xs text-slate-500 line-clamp-1">{type.description}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Reports */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h3>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-24 bg-slate-200 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : recentReports.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-slate-600 font-medium">No reports yet</p>
                                <p className="text-sm text-slate-500 mt-1">Generate your first report above</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentReports.map(report => (
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
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="w-full px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Generate New Report
                    </button>
                </div>
            </div>

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
        </>
    )
}
