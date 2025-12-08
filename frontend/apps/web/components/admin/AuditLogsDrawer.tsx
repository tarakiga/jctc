'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@jctc/ui'
import { auditService, AuditStats } from '@/lib/services/audit'
import { apiClient } from '@/lib/services/api-client'

// Icons
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const SearchIcon = () => (
    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)

const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)

const FilterIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
)

interface AuditLogsDrawerProps {
    isOpen: boolean
    onClose: () => void
}

interface AuditLog {
    id: string
    action: string
    entity_type: string
    entity_id: string
    user_id: string
    user_name?: string
    details?: any
    ip_address?: string
    user_agent?: string
    created_at: string
    severity?: string
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700 border-green-200',
    UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    VIEW: 'bg-slate-100 text-slate-700 border-slate-200',
    LOGIN: 'bg-purple-100 text-purple-700 border-purple-200',
    LOGOUT: 'bg-amber-100 text-amber-700 border-amber-200',
    EXPORT: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

const SEVERITY_COLORS: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
}

export function AuditLogsDrawer({ isOpen, onClose }: AuditLogsDrawerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [stats, setStats] = useState<AuditStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [actionFilter, setActionFilter] = useState<string | null>(null)
    const [entityFilter, setEntityFilter] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    const loadData = async () => {
        try {
            setLoading(true)
            const [statsData, logsData] = await Promise.all([
                auditService.getAuditStats(),
                apiClient.get<{ items: AuditLog[], total: number }>('/audit/logs', {
                    params: { limit: 100 }
                })
            ])
            setStats(statsData)
            setLogs(logsData.items || [])
        } catch (error) {
            console.error('Failed to load audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesAction = !actionFilter || log.action === actionFilter
        const matchesEntity = !entityFilter || log.entity_type === entityFilter
        return matchesSearch && matchesAction && matchesEntity
    })

    const uniqueActions = [...new Set(logs.map(l => l.action))]
    const uniqueEntities = [...new Set(logs.map(l => l.entity_type))]

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
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
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

                {/* Stats Bar */}
                {stats && (
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-900">{stats.total_entries?.toLocaleString() || 0}</span>
                            <span className="text-sm text-slate-500">Total Entries</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-amber-600">{stats.entries_today || 0}</span>
                            <span className="text-sm text-slate-500">Today</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600">{stats.entries_this_week || 0}</span>
                            <span className="text-sm text-slate-500">This Week</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-purple-600">{stats.entries_this_month || 0}</span>
                            <span className="text-sm text-slate-500">This Month</span>
                        </div>
                        <div className="flex-1" />
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <RefreshIcon />
                            Refresh
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                    <select
                        value={actionFilter || ''}
                        onChange={(e) => setActionFilter(e.target.value || null)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                    <select
                        value={entityFilter || ''}
                        onChange={(e) => setEntityFilter(e.target.value || null)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    >
                        <option value="">All Entities</option>
                        {uniqueEntities.map(entity => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Logs List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                                ))}
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="mt-2 text-slate-500">No audit logs found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredLogs.map((log) => (
                                    <button
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${selectedLog?.id === log.id
                                                ? 'border-amber-500 bg-amber-50 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge className={`text-xs border ${ACTION_COLORS[log.action] || ACTION_COLORS.VIEW}`}>
                                                    {log.action}
                                                </Badge>
                                                <span className="font-medium text-slate-900">{log.entity_type}</span>
                                                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                    {log.entity_id?.slice(0, 8)}...
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {log.severity && (
                                                    <Badge className={`text-xs ${SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.LOW}`}>
                                                        {log.severity}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-slate-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                                            <span>User: {log.user_name || log.user_id?.slice(0, 8) || 'System'}</span>
                                            {log.ip_address && <span>IP: {log.ip_address}</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    {selectedLog && (
                        <div className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
                            <div className="p-4 border-b border-slate-200 bg-white">
                                <h3 className="font-semibold text-slate-900">Log Details</h3>
                                <p className="text-xs text-slate-500 mt-1">ID: {selectedLog.id}</p>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Action</p>
                                        <Badge className={`text-sm border ${ACTION_COLORS[selectedLog.action] || ACTION_COLORS.VIEW}`}>
                                            {selectedLog.action}
                                        </Badge>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Entity</p>
                                        <p className="text-sm text-slate-900">{selectedLog.entity_type}</p>
                                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 mt-1 block">
                                            {selectedLog.entity_id}
                                        </code>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">User</p>
                                        <p className="text-sm text-slate-900">{selectedLog.user_name || 'Unknown'}</p>
                                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 mt-1 block">
                                            {selectedLog.user_id}
                                        </code>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Timestamp</p>
                                        <p className="text-sm text-slate-900">
                                            {new Date(selectedLog.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    {selectedLog.ip_address && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">IP Address</p>
                                            <p className="text-sm text-slate-900">{selectedLog.ip_address}</p>
                                        </div>
                                    )}

                                    {selectedLog.user_agent && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">User Agent</p>
                                            <p className="text-xs text-slate-600 break-all">{selectedLog.user_agent}</p>
                                        </div>
                                    )}

                                    {selectedLog.details && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Details</p>
                                            <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto text-slate-700">
                                                {JSON.stringify(selectedLog.details, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-white">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
