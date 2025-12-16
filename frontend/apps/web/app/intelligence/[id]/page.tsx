'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, User, Link as LinkIcon, Paperclip,
    MoreHorizontal, Shield, AlertTriangle, FileText, Download
} from 'lucide-react';
import { StatusBadge } from '../../../components/intelligence/StatsInfo';
import AuthenticatedLayout from '../../../components/layouts/AuthenticatedLayout';
import { format } from 'date-fns';
import { intelligenceService } from '../../../lib/services/intelligence';
import { IntelRecord } from '../../../types/intelligence';

export default function IntelDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [record, setRecord] = useState<IntelRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadRecord = async () => {
            setLoading(true);
            try {
                const data = await intelligenceService.getRecord(id);
                setRecord(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load record details.");
            } finally {
                setLoading(false);
            }
        };
        loadRecord();
    }, [id]);


    if (loading) {
        return (
            <AuthenticatedLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (!record || error) {
        return (
            <AuthenticatedLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h2 className="text-2xl font-bold text-slate-800">Record Not Found</h2>
                    <p className="text-slate-500 mb-6">{error || "The intelligence record you requested does not exist."}</p>
                    <Link href="/intelligence">
                        <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </button>
                    </Link>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="min-h-screen bg-slate-50/50 p-8">
                {/* Breadcrumb / Back Navigation */}
                <div className="mb-6">
                    <Link href="/intelligence" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Header Card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex flex-wrap gap-2">
                                    <StatusBadge type="category" value={record.category} />
                                    <StatusBadge type="priority" value={record.priority} />
                                    <StatusBadge type="status" value={record.status} />
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">{record.title}</h1>

                            <div className="flex flex-wrap gap-6 text-sm text-slate-500 border-t border-slate-100 pt-4 mt-6">
                                <div className="flex items-center">
                                    <User className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>
                                        Author: <span className="font-medium text-slate-700">{record.author.name}</span>
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>Created: {record.createdAt ? format(new Date(record.createdAt), 'MMM d, yyyy HH:mm') : 'N/A'}</span>
                                </div>
                                <div className="flex items-center">
                                    <Shield className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>Source: <span className="font-medium text-slate-700">{record.source}</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Handling Instructions */}
                        {record.isConfidential && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-800 text-sm mb-1 uppercase tracking-wide">Handling Instructions: CONFIDENTIAL</h4>
                                    <p className="text-amber-700 text-sm">
                                        This record contains sensitive information. Do not distribute without authorization.
                                        Access is logged and audited.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Main Description */}
                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Intelligence Report
                            </h3>
                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {record.description}
                            </div>
                        </div>

                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">

                        {/* Linked Cases */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center text-sm">
                                    <LinkIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    Linked Cases
                                </h3>
                                <div className="flex gap-2 items-center">
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {record.linkedCases.length}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {record.linkedCases.length > 0 ? (
                                    record.linkedCases.map(link => (
                                        <Link key={link.caseId} href={`/cases/${link.caseId}`}>
                                            <div className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        {link.caseNumber}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                                    {link.caseTitle}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-slate-400 italic">No cases linked yet.</p>
                                        <button className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                            + Link to Case
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center text-sm">
                                    <Paperclip className="w-4 h-4 mr-2 text-blue-600" />
                                    Attachments
                                </h3>
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {record.attachments.length}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {record.attachments.length > 0 ? (
                                    record.attachments.map(att => (
                                        <div key={att.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center min-w-0">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 mr-3 flex-shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{att.fileName}</p>
                                                    <p className="text-xs text-slate-400">{att.fileSize} • {format(new Date(att.uploadedAt), 'MMM d')}</p>
                                                </div>
                                            </div>
                                            <button className="text-slate-400 hover:text-blue-600 p-2">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-sm text-slate-400 italic">
                                        No attachments
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {record.tags.map(tag => (
                                    <span key={tag} className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
