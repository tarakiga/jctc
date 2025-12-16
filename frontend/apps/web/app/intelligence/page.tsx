'use client';

import { useState } from 'react';
import {
    Search, Filter, Plus, FileText, ArrowDown, CheckCircle, AlertTriangle, Activity, Clock
} from 'lucide-react';
import { IntelCategory, IntelStatus } from '../../types/intelligence';
import { StatsCard } from '../../components/intelligence/StatsInfo';
import AuthenticatedLayout from '../../components/layouts/AuthenticatedLayout';

export default function IntelligenceDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<IntelCategory | 'ALL'>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<IntelStatus | 'ALL'>('ALL');

    // Placeholder stats (no API calls)
    const stats = {
        total: 0,
        critical: 0,
        actionable: 0,
        recent: 0
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
                        trend="--"
                        trendUp={true}
                    />
                    <StatsCard
                        title="Critical Priority"
                        value={stats.critical}
                        icon={AlertTriangle}
                        trend="--"
                        trendUp={false}
                        color="red"
                    />
                    <StatsCard
                        title="Actionable Intel"
                        value={stats.actionable}
                        icon={CheckCircle}
                        trend="--"
                        trendUp={true}
                        color="emerald"
                    />
                    <StatsCard
                        title="Recent Activity"
                        value={stats.recent}
                        icon={Activity}
                        trend="--"
                        color="blue"
                    />
                </div>

                {/* Filters & Search (Disabled) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between opacity-50">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search keywords, subjects, or IDs..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none text-sm cursor-not-allowed"
                            value={searchQuery}
                            disabled
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Filters:</span>
                        </div>

                        <select
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-slate-50 cursor-not-allowed min-w-[140px]"
                            value={selectedCategory}
                            disabled
                        >
                            <option value="ALL">All Categories</option>
                        </select>

                        <select
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-slate-50 cursor-not-allowed min-w-[140px]"
                            value={selectedStatus}
                            disabled
                        >
                            <option value="ALL">All Statuses</option>
                        </select>
                    </div>
                </div>

                {/* Coming Soon Empty State */}
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Intelligence Module Coming Soon</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        The Intelligence module is currently under development.
                        You'll be able to create, manage, and analyze intelligence records here.
                    </p>
                    <div className="mt-8 flex justify-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            HUMINT
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            OSINT
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                            SIGINT
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            FININT
                        </span>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
