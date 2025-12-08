'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { lookupService, LookupCategory, LookupValue, LookupCategoryWithValues } from '@/lib/services/lookups'

// Icons
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
)

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
)

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
)

const XIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

interface LookupManagementDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function LookupManagementDrawer({ isOpen, onClose }: LookupManagementDrawerProps) {
    const [categories, setCategories] = useState<LookupCategory[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [categoryData, setCategoryData] = useState<LookupCategoryWithValues | null>(null)
    const [loading, setLoading] = useState(true)
    const [valuesLoading, setValuesLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingValue, setEditingValue] = useState<LookupValue | null>(null)
    const [deletingValue, setDeletingValue] = useState<LookupValue | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        value: '',
        label: '',
        description: '',
        color: '#3B82F6',
        is_active: true
    })
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Load categories when drawer opens
    useEffect(() => {
        if (isOpen) {
            loadCategories()
        }
    }, [isOpen])

    // Load values when category changes
    useEffect(() => {
        if (selectedCategory) {
            loadCategoryValues(selectedCategory)
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

    const handleAddValue = async () => {
        if (!selectedCategory) return
        if (!formData.value.trim() || !formData.label.trim()) {
            setFormError('Value and Label are required')
            return
        }

        try {
            setSubmitting(true)
            setFormError('')
            await lookupService.createValue({
                category: selectedCategory,
                value: formData.value.toUpperCase().replace(/\s+/g, '_'),
                label: formData.label,
                description: formData.description || undefined,
                color: formData.color || undefined,
                is_active: formData.is_active
            })
            setShowAddModal(false)
            setFormData({ value: '', label: '', description: '', color: '#3B82F6', is_active: true })
            loadCategoryValues(selectedCategory)
            loadCategories()
        } catch (error: any) {
            setFormError(error.message || 'Failed to create value')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditValue = async () => {
        if (!editingValue) return

        try {
            setSubmitting(true)
            setFormError('')
            await lookupService.updateValue(editingValue.id, {
                label: formData.label,
                description: formData.description || undefined,
                color: formData.color || undefined,
                is_active: formData.is_active
            })
            setShowEditModal(false)
            setEditingValue(null)
            if (selectedCategory) {
                loadCategoryValues(selectedCategory)
            }
        } catch (error: any) {
            setFormError(error.message || 'Failed to update value')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteValue = async () => {
        if (!deletingValue) return

        try {
            setSubmitting(true)
            await lookupService.deleteValue(deletingValue.id)
            setShowDeleteModal(false)
            setDeletingValue(null)
            if (selectedCategory) {
                loadCategoryValues(selectedCategory)
                loadCategories()
            }
        } catch (error: any) {
            console.error('Failed to delete value:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleActive = async (value: LookupValue) => {
        try {
            await lookupService.updateValue(value.id, { is_active: !value.is_active })
            if (selectedCategory) {
                loadCategoryValues(selectedCategory)
                loadCategories()
            }
        } catch (error) {
            console.error('Failed to toggle value:', error)
        }
    }

    const openEditModal = (value: LookupValue) => {
        setEditingValue(value)
        setFormData({
            value: value.value,
            label: value.label,
            description: value.description || '',
            color: value.color || '#3B82F6',
            is_active: value.is_active
        })
        setFormError('')
        setShowEditModal(true)
    }

    const filteredValues = categoryData?.values.filter(v =>
        v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.value.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Lookup Values Management</h2>
                        <p className="text-indigo-100 text-sm">Manage system reference values and dropdown options</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Categories Sidebar */}
                    <div className="w-64 border-r border-slate-200 bg-slate-50 flex-shrink-0 overflow-y-auto">
                        <div className="p-3 border-b border-slate-200 bg-white">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</p>
                        </div>
                        {loading ? (
                            <div className="p-4 text-sm text-slate-500">Loading...</div>
                        ) : (
                            <div className="py-1">
                                {categories.map((category) => (
                                    <button
                                        key={category.key}
                                        onClick={() => setSelectedCategory(category.key)}
                                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-100 transition-colors text-sm ${selectedCategory === category.key ? 'bg-indigo-50 border-l-2 border-l-indigo-500 text-indigo-700' : 'text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium truncate">{category.name}</span>
                                            <Badge variant="default" className="text-xs ml-2">
                                                {category.active_count}/{category.count}
                                            </Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Values Panel */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {categoryData && (
                            <>
                                {/* Values Header */}
                                <div className="px-6 py-4 border-b border-slate-200 bg-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{categoryData.name}</h3>
                                            <p className="text-sm text-slate-500">{categoryData.description}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFormData({ value: '', label: '', description: '', color: '#3B82F6', is_active: true })
                                                setFormError('')
                                                setShowAddModal(true)
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            <PlusIcon />
                                            <span>Add</span>
                                        </button>

                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search values..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                {/* Values List */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {valuesLoading ? (
                                        <div className="animate-pulse space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-14 bg-slate-100 rounded-lg"></div>
                                            ))}
                                        </div>
                                    ) : filteredValues.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-slate-500">No values found</p>
                                            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddModal(true)}>
                                                Add first value
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredValues.map((value) => (
                                                <div
                                                    key={value.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${value.is_active
                                                        ? 'bg-white border-slate-200 hover:border-slate-300'
                                                        : 'bg-slate-50 border-slate-200 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-3 h-3 rounded-full border border-slate-200"
                                                            style={{ backgroundColor: value.color || '#6B7280' }}
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm text-slate-900">{value.label}</span>
                                                                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                                    {value.value}
                                                                </code>
                                                                {value.is_system && (
                                                                    <Badge variant="info" className="text-xs">System</Badge>
                                                                )}
                                                                {!value.is_active && (
                                                                    <Badge variant="default" className="text-xs bg-slate-400">Inactive</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleToggleActive(value)}
                                                            className={`p-1.5 rounded transition-colors ${value.is_active
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-slate-400 hover:bg-slate-100'
                                                                }`}
                                                            title={value.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {value.is_active ? <CheckIcon /> : <XIcon />}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(value)}
                                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <EditIcon />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeletingValue(value)
                                                                setShowDeleteModal(true)
                                                            }}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                            <h2 className="text-lg font-bold text-white">Add New Value</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Value (Code)</label>
                                <input
                                    type="text"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    placeholder={selectedCategory === 'case_severity' ? 'e.g., 1, 2, 3 (numeric)' : 'e.g., NEW_STATUS'}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {selectedCategory === 'case_severity'
                                        ? 'Use numeric values for severity levels (1=lowest, 5=highest)'
                                        : 'Will be converted to uppercase with underscores'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    placeholder="e.g., New Status"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddValue}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingValue && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
                            <h2 className="text-lg font-bold text-white">Edit Value</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Value (Code)</label>
                                <input
                                    type="text"
                                    value={formData.value}
                                    disabled
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        type="checkbox"
                                        id="edit_is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <label htmlFor="edit_is_active" className="text-sm text-slate-700">Active</label>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setShowEditModal(false)}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditValue}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingValue && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-red-500 to-rose-500">
                            <h2 className="text-lg font-bold text-white">Delete Value</h2>
                        </div>
                        <div className="p-5">
                            <p className="text-slate-700 text-sm">
                                Are you sure you want to delete <strong>{deletingValue.label}</strong>?
                            </p>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteValue}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {submitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
