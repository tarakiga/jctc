'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertTriangle, Info, CheckCircle, FileText } from 'lucide-react';
import AuthenticatedLayout from '../../../components/layouts/AuthenticatedLayout';
import { IntelCategory, IntelStatus, IntelPriority } from '../../../types/intelligence';
import { intelligenceService } from '../../../lib/services/intelligence';

export default function CreateIntelPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: IntelCategory.HUMINT,
        priority: IntelPriority.MEDIUM,
        status: IntelStatus.RAW,
        source: '',
        isConfidential: false,
        tags: '',
        description: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({
            ...formData,
            [e.target.name]: value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!formData.title || !formData.source) {
            setError("Title and Source are required.");
            setLoading(false);
            return;
        }

        try {
            const newRecord = await intelligenceService.createRecord(formData);
            // Redirect to the new record
            router.push(`/intelligence/${newRecord.id}`);
        } catch (err) {
            console.error("Failed to create record:", err);
            setError("Failed to create intelligence record. Please try again.");
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="min-h-screen bg-slate-50/50 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/intelligence" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium mb-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Intelligence Record</h1>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></span>
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Record
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
                        <AlertTriangle className="w-5 h-5 mr-3" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Basic Info */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-blue-600" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Record Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        placeholder="e.g. Suspected trafficking activity in Lekki"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Source <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        placeholder="e.g. CI-402, Anonymous Tip"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        placeholder="e.g. trafficking, drugs, lekki (comma separated)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Analysis / Content */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Intelligence Details
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description & Analysis</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={10}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-y"
                                    placeholder="Enter detailed intelligence information..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Controls */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                                Classification
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                                    >
                                        {Object.values(IntelCategory).map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
                                    <select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                                    >
                                        {Object.values(IntelPriority).map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                                    >
                                        {Object.values(IntelStatus).map((s) => (
                                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="confidential"
                                        name="isConfidential"
                                        type="checkbox"
                                        checked={formData.isConfidential}
                                        onChange={handleChange}
                                        className="focus:ring-amber-500 h-4 w-4 text-amber-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="confidential" className="font-medium text-amber-900">Mark as Confidential</label>
                                    <p className="text-amber-700 mt-1">
                                        Restricts visible access to this record to authorized personnel only.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
