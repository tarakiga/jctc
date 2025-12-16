'use client'

import { useState, useEffect } from 'react'
import { Button, Badge } from '@jctc/ui'
import { lookupService, LookupCategory, LookupValue, LookupCategoryWithValues } from '@/lib/services/lookups'
import {
    X, Plus, Search, Edit2, Trash2, Check, XCircle,
    ArrowLeft, Filter, ExternalLink, Settings, Tag, Palette
} from 'lucide-react'

interface LookupManagementDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function LookupManagementDrawer({ isOpen, onClose }: LookupManagementDrawerProps) {
    // Data State
    const [categories, setCategories] = useState<LookupCategory[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [categoryData, setCategoryData] = useState<LookupCategoryWithValues | null>(null)

    // UI State
    const [view, setView] = useState<'list' | 'form'>('list')
    const [loading, setLoading] = useState(true)
    const [valuesLoading, setValuesLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [categorySearch, setCategorySearch] = useState('')

    // Form State
    const [editingMode, setEditingMode] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        value: '',
        label: '',
        description: '',
        color: '#3B82F6',
        is_active: true
    })
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Delete State
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Load categories when drawer opens
    useEffect(() => {
        if (isOpen) {
            loadCategories()
            setView('list')
            setEditingMode(false)
        }
    }, [isOpen])

    // Load values when category changes
    useEffect(() => {
        if (selectedCategory) {
            loadCategoryValues(selectedCategory)
            setView('list') // Reset to list view when changing category
        }
    }, [selectedCategory])

    const loadCategories = async () => {
        try {
            setLoading(true)
            const data = await lookupService.getCategories()
            setCategories(data)
            if (data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].key)
            }
        } catch (error) {
            console.error('Failed to load categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadCategoryValues = async (category: string) => {
        try {
            setValuesLoading(true)
            const data = await lookupService.getCategoryValues(category, true)
            setCategoryData(data)
        } catch (error) {
            console.error('Failed to load values:', error)
        } finally {
            setValuesLoading(false)
        }
    }

    const handleOpenCreate = () => {
        setEditingMode(false)
        setEditingId(null)
        setFormData({
            value: '',
            label: '',
            description: '',
            color: '#3B82F6',
            is_active: true
        })
        setFormError('')
        setView('form')
    }

    const handleOpenEdit = (value: LookupValue) => {
        setEditingMode(true)
        setEditingId(value.id)
        setFormData({
            value: value.value,
            label: value.label,
            description: value.description || '',
            color: value.color || '#3B82F6',
            is_active: value.is_active
        })
        setFormError('')
        setView('form')
    }

    const handleSubmit = async () => {
        if (!selectedCategory) return
        if (!formData.value.trim() || !formData.label.trim()) {
            setFormError('Code and Label are required')
            return
        }

        try {
            setSubmitting(true)
            setFormError('')

            if (editingMode && editingId) {
                await lookupService.updateValue(editingId, {
                    label: formData.label,
                    description: formData.description || undefined,
                    color: formData.color || undefined,
                    is_active: formData.is_active
                })
            } else {
                await lookupService.createValue({
                    category: selectedCategory,
                    value: formData.value.toUpperCase().replace(/\s+/g, '_'),
                    label: formData.label,
                    description: formData.description || undefined,
                    color: formData.color || undefined,
                    is_active: formData.is_active
                })
            }

            // Success
            await loadCategoryValues(selectedCategory)
            await loadCategories() // Update counts
            setView('list')
        } catch (error: any) {
            setFormError(error.message || 'Failed to save value')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            setSubmitting(true)
            await lookupService.deleteValue(id)
            setDeleteConfirmId(null)
            if (selectedCategory) {
                await loadCategoryValues(selectedCategory)
                await loadCategories()
            }
        } catch (error) {
            console.error('Failed to delete:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleActive = async (value: LookupValue) => {
        try {
            await lookupService.updateValue(value.id, { is_active: !value.is_active })
            if (selectedCategory) {
                // Optimistic update could be done here, but reloading is safer
                loadCategoryValues(selectedCategory)
            }
        } catch (error) {
            console.error('Failed to toggle active:', error)
        }
    }

    // Filtering
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    )

    const filteredValues = categoryData?.values.filter(v =>
        v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.value.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right sm:border-l sm:border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            Lookup Management
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Configure system dropdowns and reference data</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar - Category Selection */}
                    <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
                        <div className="p-4 border-b border-slate-200/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter categories..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {loading ? (
                                <div className="p-4 flex justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : filteredCategories.map((category) => (
                                <button
                                    key={category.key}
                                    onClick={() => setSelectedCategory(category.key)}
                                    className={`w-full px-3 py-3 text-left rounded-lg transition-all duration-200 group relative ${selectedCategory === category.key
                                        ? 'bg-white shadow-sm ring-1 ring-slate-200'
                                        : 'hover:bg-slate-100/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${selectedCategory === category.key ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            {category.name}
                                        </span>
                                        {selectedCategory === category.key && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                                        )}
                                        <Badge variant={selectedCategory === category.key ? 'default' : 'default'} className={selectedCategory === category.key ? '' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                                            {category.active_count}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-slate-400 truncate block mt-0.5 pr-6">
                                        {category.key}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Content */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                        {/* VIEW: LIST */}
                        {view === 'list' && categoryData && (
                            <div className="absolute inset-0 flex flex-col animate-in fade-in duration-300">
                                {/* Toolbar */}
                                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-slate-900 truncate pr-2">{categoryData.name}</h3>
                                        <p className="text-sm text-slate-500 truncate max-w-xl">{categoryData.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="relative hidden md:block">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search values..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-64 pl-9 pr-3 py-2 bg-slate-50 border-transparent hover:bg-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg text-sm transition-all"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleOpenCreate}
                                            className="bg-black hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all duration-200"
                                        >
                                            <Plus className="w-4 h-4 mr-1.5" />
                                            Add Value
                                        </Button>
                                    </div>
                                </div>

                                {/* Table Header */}
                                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-4 pl-2">Label / Description</div>
                                    <div className="col-span-3">Code</div>
                                    <div className="col-span-2">Color</div>
                                    <div className="col-span-1 text-center">Status</div>
                                    <div className="col-span-2 text-right pr-2">Actions</div>
                                </div>

                                {/* Table Body */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {valuesLoading ? (
                                        <div className="p-8 space-y-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredValues.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-600">No values found</p>
                                            <p className="text-sm">Try adjusting your search or add a new value.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {filteredValues.map((value) => (
                                                <div
                                                    key={value.id}
                                                    className="group grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50/80 transition-colors duration-150"
                                                >
                                                    <div className="col-span-4 pl-2">
                                                        <div className="font-medium text-slate-900">{value.label}</div>
                                                        {value.description && (
                                                            <div className="text-xs text-slate-500 truncate">{value.description}</div>
                                                        )}
                                                    </div>

                                                    <div className="col-span-3">
                                                        <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {value.value}
                                                        </code>
                                                        {value.is_system && (
                                                            <span className="ml-2 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">System</span>
                                                        )}
                                                    </div>

                                                    <div className="col-span-2 flex items-center gap-2">
                                                        <div
                                                            className="w-6 h-6 rounded-md border border-slate-200 shadow-sm"
                                                            style={{ backgroundColor: value.color || '#E2E8F0' }}
                                                        />
                                                        <span className="text-xs text-slate-400 font-mono">{value.color}</span>
                                                    </div>

                                                    <div className="col-span-1 flex justify-center">
                                                        <button
                                                            onClick={() => handleToggleActive(value)}
                                                            className={`
                                                                relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                                                                ${value.is_active ? 'bg-indigo-600' : 'bg-slate-200'}
                                                            `}
                                                            title={value.is_active ? 'Active' : 'Inactive'}
                                                        >
                                                            <span className={`
                                                                pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                                                ${value.is_active ? 'translate-x-4' : 'translate-x-0'}
                                                            `} />
                                                        </button>
                                                    </div>

                                                    <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                            onClick={() => handleOpenEdit(value)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>

                                                        {deleteConfirmId === value.id ? (
                                                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg absolute right-4 z-10 shadow-lg border border-red-100 animate-in zoom-in">
                                                                <span className="text-[10px] text-red-600 font-medium px-1">Sure?</span>
                                                                <button
                                                                    className="p-1 hover:bg-red-200 rounded text-red-700"
                                                                    onClick={() => handleDelete(value.id)}
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                                    onClick={() => setDeleteConfirmId(null)}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            !value.is_system && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => setDeleteConfirmId(value.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW: FORM */}
                        {view === 'form' && (
                            <div className="absolute inset-0 flex flex-col bg-slate-50/50 animate-in slide-in-from-right duration-300">
                                {/* Form Header */}
                                <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-4">
                                    <button
                                        onClick={() => setView('list')}
                                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            {editingMode ? 'Edit Value' : 'Create New Value'}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {categoryData?.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Form Body */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="max-w-2xl mx-auto space-y-6">

                                        {/* Preview Card */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Preview</span>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                                                        style={{ backgroundColor: formData.color || '#3B82F6' }}
                                                    >
                                                        {formData.label ? formData.label[0].toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-lg">
                                                            {formData.label || 'Label Preview'}
                                                        </div>
                                                        <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                                            {formData.value || 'CODE_PREVIEW'}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-full w-px bg-slate-100 mx-6"></div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Details</span>
                                                <Badge variant={formData.is_active ? 'success' : 'default'} className={formData.is_active ? '' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                                                    {formData.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Inputs */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                        <Tag className="w-4 h-4 text-slate-400" />
                                                        Code Value
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.value}
                                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                                        disabled={editingMode}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 font-mono text-sm"
                                                        placeholder="e.g., NEW_STATUS"
                                                    />
                                                    <p className="text-xs text-slate-500">
                                                        Unique identifier. Converted to uppercase.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Display Label</label>
                                                    <input
                                                        type="text"
                                                        value={formData.label}
                                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        placeholder="e.g., New Status"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm h-20 resize-none"
                                                    placeholder="Brief description of what this value represents..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                        <Palette className="w-4 h-4 text-slate-400" />
                                                        Color Tag
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={formData.color}
                                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={formData.color}
                                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-end">
                                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            id="is_active_check"
                                                            checked={formData.is_active}
                                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                                                        />
                                                        <label htmlFor="is_active_check" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                                            Active & Visible
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {formError && (
                                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                                                    <XCircle className="w-4 h-4" />
                                                    {formError}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Footer */}
                                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                                    <Button variant="ghost" onClick={() => setView('list')} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="min-w-[100px]">
                                        {submitting ? 'Saving...' : editingMode ? 'Save Changes' : 'Create Value'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
