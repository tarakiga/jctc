'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

// Icons
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)

interface AuditLog {
    id: string
    action: string
    entity_type: string
    entity_id?: string
    user_id?: string
    description: string
    created_at: string
    severity: string
    ip_address?: string
}

interface AuditLogsDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function AuditLogsDrawer({ isOpen, onClose }: AuditLogsDrawerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [severityFilter, setSeverityFilter] = useState('ALL')
    const [actionFilter, setActionFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        if (isOpen) {
            fetchAuditLogs()
        }
    }, [isOpen, page, severityFilter, actionFilter])

    const fetchAuditLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: '20',
                ...(severityFilter !== 'ALL' && { severity: severityFilter }),
                ...(actionFilter !== 'ALL' && { action: actionFilter }),
                ...(searchQuery && { search: searchQuery })
            })

            const response = await fetch(`/api/v1/audit/logs/?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setLogs(data.items || [])
                setTotalPages(Math.ceil((data.total || 0) / 20))
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        setPage(1)
        fetchAuditLogs()
    }

    const getSeverityColor = (severity: string) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL': return 'text-red-700 bg-red-100 border-red-300'
            case 'HIGH': return 'text-orange-700 bg-orange-100 border-orange-300'
            case 'MEDIUM': return 'text-yellow-700 bg-yellow-100 border-yellow-300'
            case 'LOW': return 'text-blue-700 bg-blue-100 border-blue-300'
            default: return 'text-slate-700 bg-slate-100 border-slate-300'
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
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Audit Logs</h2>
                        <p className="text-amber-100 text-sm">Complete system activity trail</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex gap-3">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search logs..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                                <SearchIcon />
                                <button
                                    onClick={handleSearch}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Severity Filter */}
                        <select
                            value={severityFilter}
                            onChange={(e) => {
                                setSeverityFilter(e.target.value)
                                setPage(1)
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="ALL">All Severities</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                        </select>

                        {/* Action Filter */}
                        <select
                            value={actionFilter}
                            onChange={(e) => {
                                setActionFilter(e.target.value)
                                setPage(1)
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="ALL">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="READ">Read</option>
                            <option value="EXPORT">Export</option>
                        </select>
                    </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium">No audit logs found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Severity Badge */}
                                        <div className={`shrink-0 px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(log.severity)}`}>
                                            {log.severity || 'INFO'}
                                        </div>

                                        {/* Log Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-900">{log.action}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-sm text-slate-600">{log.entity_type}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 mb-2">{log.description}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                                                {log.ip_address && (
                                                    <>
                                                        <span>•</span>
                                                        <span>IP: {log.ip_address}</span>
                                                    </>
                                                )}
                                                {log.user_id && (
                                                    <>
                                                        <span>•</span>
                                                        <span>User: {log.user_id.substring(0, 8)}...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="text-sm text-slate-600">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 border border-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
