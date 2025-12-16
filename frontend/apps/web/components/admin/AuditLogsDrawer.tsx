'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
    X, Search, Filter, AlertTriangle, Shield, Database,
    FileText, User, Globe, Clock, Activity, ArrowRight,
    ChevronLeft, ChevronRight
} from 'lucide-react'

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
    const [totalLogs, setTotalLogs] = useState(0)

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
                setTotalLogs(data.total || 0)
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

    const getSeverityStyles = (severity: string) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL': return { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', border: 'border-red-200', text: 'text-red-700' }
            case 'HIGH': return { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', border: 'border-orange-200', text: 'text-orange-700' }
            case 'MEDIUM': return { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-200', text: 'text-amber-700' }
            case 'LOW': return { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200', text: 'text-blue-700' }
            default: return { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-500', border: 'border-slate-200', text: 'text-slate-600' }
        }
    }

    const getActionIcon = (action: string) => {
        if (action.includes('CREATE')) return <PlusIcon className="w-4 h-4" />
        if (action.includes('DELETE')) return <TrashIcon className="w-4 h-4" />
        if (action.includes('UPDATE')) return <EditIcon className="w-4 h-4" />
        if (action.includes('LOGIN')) return <User className="w-4 h-4" />
        return <Activity className="w-4 h-4" />
    }

    // Helper icons for map
    const PlusIcon = ({ className }: { className?: string }) => <div className={className}>+</div>
    const TrashIcon = ({ className }: { className?: string }) => <div className={className}>×</div>
    const EditIcon = ({ className }: { className?: string }) => <div className={className}>✎</div>

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right sm:border-l sm:border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            Audit Log
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">System activity and security events</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filters Toolbar */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 w-full md:w-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search logs..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200">
                            <Filter className="w-4 h-4" />
                            <select
                                value={severityFilter}
                                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                                className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 font-medium cursor-pointer"
                            >
                                <option value="ALL">All Severities</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200">
                            <Activity className="w-4 h-4" />
                            <select
                                value={actionFilter}
                                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                                className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 font-medium cursor-pointer"
                            >
                                <option value="ALL">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="Read">Read</option>
                                <option value="LOGIN">Login</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
                            <p className="text-sm text-slate-500">Loading audit trail...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-lg font-medium text-slate-600">No events found</p>
                            <p className="text-sm">Try adjusting your time range or filters.</p>
                        </div>
                    ) : (
                        <div className="relative space-y-8 pl-4">
                            {/* Timeline Line */}
                            <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200" />

                            {logs.map((log, index) => {
                                const styles = getSeverityStyles(log.severity)
                                const isCritical = log.severity === 'CRITICAL' || log.severity === 'HIGH'

                                return (
                                    <div key={log.id} className="relative flex gap-6 group animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                        {/* Timeline Dot/Icon */}
                                        <div className={`
                                            relative z-10 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0
                                            ${styles.icon}
                                        `}>
                                            {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                        </div>

                                        {/* Content Card */}
                                        <div className={`
                                            flex-1 bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md
                                            ${isCritical ? 'border-red-100 rings-1 ring-red-50' : 'border-slate-200'}
                                        `}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} border ${styles.border}`}>
                                                        {log.severity || 'INFO'}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-900">{log.action}</span>
                                                    <span className="text-slate-300">/</span>
                                                    <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                                        <Database className="w-3 h-3 text-slate-400" />
                                                        {log.entity_type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                </div>
                                            </div>

                                            <p className="text-slate-600 text-sm mb-3">
                                                {log.description}
                                            </p>

                                            <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-50">
                                                {log.user_id && (
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        <span className="font-mono">{log.user_id.substring(0, 8)}...</span>
                                                    </div>
                                                )}
                                                {log.ip_address && (
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                                                        <Globe className="w-3 h-3 text-slate-400" />
                                                        <span className="font-mono">{log.ip_address}</span>
                                                    </div>
                                                )}
                                                {log.entity_id && (
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded ml-auto">
                                                        <span className="text-slate-400">ID:</span>
                                                        <span className="font-mono">{log.entity_id.substring(0, 8)}...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-semibold text-slate-900">{logs.length}</span> of <span className="font-semibold text-slate-900">{totalLogs}</span> events
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-200"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg min-w-[3rem] text-center border border-slate-100">
                            {page}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-200"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
