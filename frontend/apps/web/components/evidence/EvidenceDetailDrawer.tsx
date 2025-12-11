'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@jctc/ui'
import { useChainOfCustody } from '@/lib/hooks/useEvidenceManagement'

export interface EvidenceDrawerProps {
    isOpen: boolean
    onClose: () => void
    evidence: any
    caseNumber?: string // Optional - if not provided, will use case_number from evidence
}

export function EvidenceDetailDrawer({ isOpen, onClose, evidence, caseNumber }: EvidenceDrawerProps) {
    const [showChainOfCustody, setShowChainOfCustody] = useState(false)

    // Fetch chain of custody for the evidence
    const { entries: custodyEntries = [], loading: custodyLoading } = useChainOfCustody(evidence?.id || '')

    if (!isOpen || !evidence) return null

    const getTypeBadge = (category: string) => {
        switch (category) {
            case 'DIGITAL':
                return { variant: 'info' as const, label: 'Digital' }
            case 'PHYSICAL':
                return { variant: 'default' as const, label: 'Physical' }
            case 'DOCUMENT':
                return { variant: 'default' as const, label: 'Document' }
            default:
                return { variant: 'default' as const, label: category || 'Unknown' }
        }
    }

    const displayCaseNumber = caseNumber || evidence.case_number || evidence.case_id

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
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
                                    <h2 className="text-2xl font-bold text-slate-900">{evidence.label || evidence.evidence_number}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        {evidence.category && (
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${evidence.category === 'DIGITAL' ? 'bg-blue-100 text-blue-700' :
                                                    evidence.category === 'PHYSICAL' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {getTypeBadge(evidence.category).label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
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
                    {evidence.description && (
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Description</h3>
                            <p className="text-slate-900 leading-relaxed">{evidence.description}</p>
                        </div>
                    )}

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
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</p>
                                    <p className="text-base font-bold text-slate-900">{getTypeBadge(evidence.category).label}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Storage Location</p>
                                    <p className="text-base font-bold text-slate-900">{evidence.storage_location || 'Not specified'}</p>
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
                                        {evidence.collected_at ? new Date(evidence.collected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
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
                                    <p className="text-base font-bold text-slate-900">{evidence.collected_by_name || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SHA-256 Section */}
                    {(evidence.sha256_hash || evidence.sha256) && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/60 p-6 shadow-sm">
                            <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                SHA-256 Hash Verified
                            </h3>
                            <code className="block w-full p-3 bg-white/50 rounded-lg border border-green-200 text-xs font-mono text-green-700 break-all select-all">
                                {evidence.sha256_hash || evidence.sha256}
                            </code>
                        </div>
                    )}

                    {/* Notes Section */}
                    {evidence.notes && (
                        <div className="bg-yellow-50 rounded-2xl border border-yellow-200/60 p-6 shadow-sm">
                            <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Notes
                            </h3>
                            <p className="text-yellow-900 leading-relaxed">{evidence.notes}</p>
                        </div>
                    )}

                    {/* Related Case */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Related Case
                        </h3>
                        <Link
                            href={`/cases/${evidence.case_id}`}
                            className="block text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors"
                        >
                            {displayCaseNumber}
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
                                        {custodyEntries.length} Records
                                    </span>
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowChainOfCustody(!showChainOfCustody)}
                                >
                                    {showChainOfCustody ? 'Hide' : 'View Full Chain'}
                                    <svg
                                        className={`w-4 h-4 ml-1.5 transition-transform ${showChainOfCustody ? 'rotate-90' : ''}`}
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
                                {custodyLoading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-slate-500">Loading custody records...</p>
                                    </div>
                                ) : custodyEntries.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                                                <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-neutral-900 font-medium">No custody records yet</p>
                                                <p className="text-sm text-neutral-500 mt-1">Chain of custody entries will appear here</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Timeline */
                                    <div className="relative">
                                        {/* Vertical Line */}
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>

                                        <div className="space-y-6">
                                            {custodyEntries.map((record: any) => {
                                                const actionColors: Record<string, string> = {
                                                    COLLECTED: 'from-emerald-500 to-emerald-600',
                                                    TRANSFERRED: 'from-blue-500 to-blue-600',
                                                    EXAMINED: 'from-purple-500 to-purple-600',
                                                    ACCESSED: 'from-amber-500 to-amber-600',
                                                    SEIZED: 'from-emerald-500 to-emerald-600',
                                                }
                                                const actionIcons: Record<string, React.ReactNode> = {
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
                                                    SEIZED: (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    ),
                                                }

                                                return (
                                                    <div key={record.id} className="relative pl-12">
                                                        {/* Timeline Node */}
                                                        <div className="absolute left-0 flex items-center justify-center">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br ${actionColors[record.action] || actionColors.TRANSFERRED}`}>
                                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    {actionIcons[record.action] || actionIcons.TRANSFERRED}
                                                                </svg>
                                                            </div>
                                                        </div>

                                                        {/* Entry card */}
                                                        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">{record.action}</span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {new Date(record.timestamp).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {record.signature_verified && (
                                                                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Signature Verified">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Compact Grid for Details */}
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
                                                                {record.from_person_name && (
                                                                    <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                                                        <span className="font-semibold text-slate-400 w-8">From:</span>
                                                                        <span className="truncate" title={record.from_person_name}>{record.from_person_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                                                    <span className="font-semibold text-slate-400 w-8">To:</span>
                                                                    <span className="truncate" title={record.to_person_name}>{record.to_person_name}</span>
                                                                </div>
                                                                <div className="col-span-2 flex items-center gap-1.5 text-slate-600 truncate">
                                                                    <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    </svg>
                                                                    <span className="truncate" title={record.location}>{record.location}</span>
                                                                </div>
                                                            </div>

                                                            {record.notes && (
                                                                <div className="pt-2 border-t border-slate-100">
                                                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-0.5">Notes</p>
                                                                    <p className="text-xs text-slate-700 leading-relaxed">{record.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
