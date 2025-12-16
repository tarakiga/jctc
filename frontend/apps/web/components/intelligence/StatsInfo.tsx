import { IntelCategory, IntelPriority, IntelStatus } from '../../types/intelligence';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

// --- Status Badge ---

interface StatusBadgeProps {
    type: 'status' | 'priority' | 'category';
    value: string;
    className?: string;
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
    let styles = 'bg-slate-100 text-slate-700 border-slate-200';
    let label = value;

    if (type === 'status') {
        switch (value) {
            case IntelStatus.RAW:
                styles = 'bg-orange-50 text-orange-700 border-orange-200';
                break;
            case IntelStatus.EVALUATED:
                styles = 'bg-blue-50 text-blue-700 border-blue-200';
                break;
            case IntelStatus.CONFIRMED:
                styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                break;
            case IntelStatus.ACTIONABLE:
                styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
                break;
            case IntelStatus.ARCHIVED:
                styles = 'bg-slate-100 text-slate-500 border-slate-200';
                break;
        }
    } else if (type === 'priority') {
        switch (value) {
            case IntelPriority.CRITICAL:
                styles = 'bg-red-50 text-red-700 border-red-200 font-bold';
                break;
            case IntelPriority.HIGH:
                styles = 'bg-orange-50 text-orange-700 border-orange-200 font-medium';
                break;
            case IntelPriority.MEDIUM:
                styles = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                break;
            case IntelPriority.LOW:
                styles = 'bg-slate-50 text-slate-600 border-slate-200';
                break;
        }
    } else if (type === 'category') {
        styles = 'bg-white text-slate-700 border-slate-200 font-medium tracking-wide text-xs uppercase';
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border transition-colors',
                styles,
                className
            )}
        >
            {label.replace(/_/g, ' ')}
        </span>
    );
}

// --- Stats Card ---

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: 'blue' | 'red' | 'emerald' | 'amber';
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp, color = 'blue' }: StatsCardProps) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600',
        red: 'bg-red-50 text-red-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                        {trend && (
                            <span className={clsx("text-xs font-medium px-1.5 py-0.5 rounded",
                                trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                            )}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                <div className={clsx("p-3 rounded-lg flex items-center justify-center", colorMap[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
