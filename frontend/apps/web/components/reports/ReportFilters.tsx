'use client'

import { REPORT_TYPES, ReportType } from '@/lib/hooks/useReports'

interface ReportFiltersProps {
    selectedType: ReportType | 'ALL'
    onTypeChange: (type: ReportType | 'ALL') => void
    searchQuery: string
    onSearchChange: (query: string) => void
}

export function ReportFilters({
    selectedType,
    onTypeChange,
    searchQuery,
    onSearchChange
}: ReportFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Search */}
            <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-400"
                />
            </div>

            {/* Type Filter */}
            <div className="sm:w-64">
                <select
                    value={selectedType}
                    onChange={e => onTypeChange(e.target.value as ReportType | 'ALL')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white appearance-none cursor-pointer"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25rem 1.25rem'
                    }}
                >
                    <option value="ALL">All Report Types</option>
                    {REPORT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
