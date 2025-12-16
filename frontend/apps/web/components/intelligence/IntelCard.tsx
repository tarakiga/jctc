import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Paperclip, Link as LinkIcon, AlertCircle, FileText } from 'lucide-react';
import { IntelRecord } from '../../types/intelligence';
import { StatusBadge } from './StatsInfo';
import clsx from 'clsx';

interface IntelCardProps {
    record: IntelRecord;
}

export function IntelCard({ record }: IntelCardProps) {
    return (
        <Link href={`/intelligence/${record.id}`}>
            <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 overflow-hidden h-full flex flex-col">
                {/* Top Accent Bar based on Priority */}
                <div className={clsx("h-1 w-full", {
                    'bg-red-500': record.priority === 'CRITICAL',
                    'bg-orange-500': record.priority === 'HIGH',
                    'bg-yellow-500': record.priority === 'MEDIUM',
                    'bg-slate-300': record.priority === 'LOW',
                })} />

                <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                            <StatusBadge type="category" value={record.category} />
                            <StatusBadge type="priority" value={record.priority} />
                        </div>

                        {record.isConfidential && (
                            <div className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-semibold border border-amber-100">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                CONFIDENTIAL
                            </div>
                        )}
                    </div>

                    {/* Title & Content */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {record.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                        {record.description}
                    </p>

                    {/* Tags */}
                    {record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                            {record.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    #{tag}
                                </span>
                            ))}
                            {record.tags.length > 3 && (
                                <span className="text-xs text-slate-400 px-1">+{record.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    {/* Footer Metadata */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                {format(new Date(record.createdAt), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center" title="Author">
                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 mr-1.5">
                                    {record.author.name.charAt(0)}
                                </div>
                                <span className="truncate max-w-[80px]">{record.author.name}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {record.attachments.length > 0 && (
                                <div className="flex items-center text-slate-500" title={`${record.attachments.length} Attachments`}>
                                    <Paperclip className="w-3.5 h-3.5 mr-1" />
                                    {record.attachments.length}
                                </div>
                            )}
                            {record.linkedCases.length > 0 && (
                                <div className="flex items-center text-blue-600 font-medium" title={`${record.linkedCases.length} Linked Cases`}>
                                    <LinkIcon className="w-3.5 h-3.5 mr-1" />
                                    {record.linkedCases.length}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hover Action Indicator */}
                <div className="absolute right-4 bottom-4 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                    <FileText className="w-4 h-4" />
                </div>
            </div>
        </Link>
    );
}
