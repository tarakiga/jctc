'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { lookupService, LookupCategory, LookupValue, LookupCategoryWithValues } from '@/lib/services/lookups'
import { UserRole } from '@jctc/types'

// Icons
const CategoryIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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

function LookupManagementContent() {
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

    // Load categories on mount
    useEffect(() => {
        loadCategories()
    }, [])

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
            // Auto-select first category
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
            loadCategories() // Refresh counts
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
                loadCategories() // Refresh counts
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
                loadCategories() // Refresh counts
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-slate-200 rounded-2xl w-1/3"></div>
                    <div className="h-64 bg-slate-200 rounded-2xl"></div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Lookup Values Management</h1>
                        <p className="text-slate-600 mt-1">Manage system reference values and dropdown options</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Categories Sidebar */}
                <div className="w-80 flex-shrink-0">
                    <Card className="sticky top-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CategoryIcon />
                                Categories
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                                {categories.map((category) => (
                                    <button
                                        key={category.key}
                                        onClick={() => setSelectedCategory(category.key)}
                                        className={`w-full px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedCategory === category.key ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-900">{category.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default" className="text-xs">
                                                    {category.active_count}/{category.count}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{category.description}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Values Grid */}
                <div className="flex-1">
                    {categoryData && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">{categoryData.name}</CardTitle>
                                        <p className="text-sm text-slate-500">{categoryData.description}</p>
                                    </div>
                                    <Button onClick={() => {
                                        setFormData({ value: '', label: '', description: '', color: '#3B82F6', is_active: true })
                                        setFormError('')
                                        setShowAddModal(true)
                                    }}>
                                        <PlusIcon />
                                        <span className="ml-2">Add Value</span>
                                    </Button>
                                </div>

                                {/* Search */}
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="Search values..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {valuesLoading ? (
                                    <div className="animate-pulse space-y-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                                        ))}
                                    </div>
                                ) : filteredValues.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-slate-500">No values found</p>
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => setShowAddModal(true)}
                                        >
                                            Add first value
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredValues.map((value) => (
                                            <div
                                                key={value.id}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${value.is_active
                                                    ? 'bg-white border-slate-200 hover:border-slate-300'
                                                    : 'bg-slate-50 border-slate-200 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Color indicator */}
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-slate-200"
                                                        style={{ backgroundColor: value.color || '#6B7280' }}
                                                    />

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-900">{value.label}</span>
                                                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                {value.value}
                                                            </code>
                                                            {value.is_system && (
                                                                <Badge variant="info" className="text-xs">System</Badge>
                                                            )}
                                                            {!value.is_active && (
                                                                <Badge variant="default" className="text-xs bg-slate-500">Inactive</Badge>
                                                            )}
                                                        </div>
                                                        {value.description && (
                                                            <p className="text-sm text-slate-500 mt-0.5">{value.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Toggle active */}
                                                    <button
                                                        onClick={() => handleToggleActive(value)}
                                                        className={`p-2 rounded-lg transition-colors ${value.is_active
                                                            ? 'text-green-600 hover:bg-green-50'
                                                            : 'text-slate-400 hover:bg-slate-100'
                                                            }`}
                                                        title={value.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {value.is_active ? <CheckIcon /> : <XIcon />}
                                                    </button>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => openEditModal(value)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <EditIcon />
                                                    </button>

                                                    {/* Delete (only for non-system values) */}
                                                    {!value.is_system && (
                                                        <button
                                                            onClick={() => {
                                                                setDeletingValue(value)
                                                                setShowDeleteModal(true)
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                            <h2 className="text-xl font-bold text-white">Add New Value</h2>
                            <p className="text-blue-100 text-sm">Add a new value to {categoryData?.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Value (Code)</label>
                                <input
                                    type="text"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., New Status"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Brief description of this value"
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
                                            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddValue} disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Value'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingValue && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
                            <h2 className="text-xl font-bold text-white">Edit Value</h2>
                            <p className="text-amber-100 text-sm">Editing: {editingValue.value}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Value (Code)</label>
                                <input
                                    type="text"
                                    value={formData.value}
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Value code cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
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
                                            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="edit_is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="edit_is_active" className="text-sm font-medium text-slate-700">Active</label>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button onClick={handleEditValue} disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingValue && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-500 to-rose-500">
                            <h2 className="text-xl font-bold text-white">Delete Value</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700">
                                Are you sure you want to delete <strong>{deletingValue.label}</strong>?
                            </p>
                            <p className="text-sm text-slate-500 mt-2">
                                This action cannot be undone. Values that are in use may cause errors.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteValue}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {submitting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function LookupManagementPage() {
    return (
        <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
            <LookupManagementContent />
        </ProtectedRoute>
    )
}
