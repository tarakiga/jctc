'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Filter, Plus, FileText, ArrowUpRight, Shield,
    Activity, ArrowDown, ChevronDown, CheckCircle, AlertTriangle
} from 'lucide-react';
import { IntelCategory, IntelStatus, IntelRecord } from '../../types/intelligence';
import { IntelCard } from '../../components/intelligence/IntelCard';
import { StatsCard, StatusBadge } from '../../components/intelligence/StatsInfo';
import AuthenticatedLayout from '../../components/layouts/AuthenticatedLayout';
import { intelligenceService } from '../../lib/services/intelligence';

export default function IntelligenceDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<IntelCategory | 'ALL'>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<IntelStatus | 'ALL'>('ALL');

    const [records, setRecords] = useState<IntelRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (searchQuery) filters.search = searchQuery;
            if (selectedCategory !== 'ALL') filters.category = selectedCategory;
            if (selectedStatus !== 'ALL') filters.status = selectedStatus;

            const data = await intelligenceService.getRecords(filters);
            setRecords(data.items);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch intelligence records', err);
            setError('Failed to load intelligence records. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchRecords();
        }, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCategory, selectedStatus]);


    // Mock Stats for now (backend stats endpoint not implemented yet)
    // Could calculate from fetched records if we fetch all, but usually stats are separate endpoint
    const stats = {
        total: records.length,
        critical: records.filter(r => r.priority === 'CRITICAL').length,
        actionable: records.filter(r => r.status === 'ACTIONABLE').length,
        recent: records.length // Simplified
    };

    return (
        <AuthenticatedLayout>
            <div className="min-h-screen bg-slate-50/50 p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Intelligence Dashboard</h1>
                        <p className="text-slate-500 mt-1">Monitor, analyze, and manage intelligence reports.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            disabled
                            className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed shadow-sm inline-flex items-center"
                        >
                            <ArrowDown className="w-4 h-4 mr-2" />
                            Export Report
                        </button>
                        <button
                            disabled
                            className="px-4 py-2 bg-slate-300 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed shadow-sm inline-flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Intel Record
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatsCard
                        title="Total Intelligence"
                        value={stats.total}
                        icon={FileText}
                        trend="+12%"
                        trendUp={true}
                    />
                    <StatsCard
                        title="Critical Priority"
                        value={stats.critical}
                        icon={AlertTriangle}
                        trend="+2"
                        trendUp={false} // Red warning
                        color="red"
                    />
                    <StatsCard
                        title="Actionable Intel"
                        value={stats.actionable}
                        icon={CheckCircle}
                        trend="+5%"
                        trendUp={true}
                        color="emerald"
                    />
                    <StatsCard
                        title="Recent Activity"
                        value={stats.recent}
                        icon={Activity}
                        trend="Active"
                        color="blue"
                    />
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search keywords, subjects, or IDs..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Filters:</span>
                        </div>

                        <select
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none bg-slate-50 cursor-pointer min-w-[140px]"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as IntelCategory | 'ALL')}
                        >
                            <option value="ALL">All Categories</option>
                            {Object.values(IntelCategory).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none bg-slate-50 cursor-pointer min-w-[140px]"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as IntelStatus | 'ALL')}
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.values(IntelStatus).map((status) => (
                                <option key={status} value={status}>{status.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <p className="text-slate-800 font-medium">{error}</p>
                        <button
                            onClick={() => fetchRecords()}
                            className="mt-4 text-blue-600 hover:underline text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No Intelligence Records Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                            Adjust your search filters or create a new intelligence record to get started.
                        </p>
                        <button
                            disabled
                            className="px-5 py-2.5 bg-slate-300 text-slate-500 rounded-lg font-medium cursor-not-allowed shadow-sm"
                        >
                            Create Record
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {records.map((record) => (
                            <IntelCard key={record.id} record={record} />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
