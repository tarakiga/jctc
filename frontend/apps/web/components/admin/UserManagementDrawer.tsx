'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@jctc/ui'
import { usersService, User, UserStats } from '@/lib/services/users'


// Icons
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)

interface UserManagementDrawerProps {
    isOpen: boolean
    onClose: () => void
}

const ROLES = ['ADMIN', 'SUPERVISOR', 'INVESTIGATOR', 'ANALYST', 'INTAKE', 'VIEWER']
const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700 border-red-200',
    SUPERVISOR: 'bg-purple-100 text-purple-700 border-purple-200',
    INVESTIGATOR: 'bg-blue-100 text-blue-700 border-blue-200',
    ANALYST: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    INTAKE: 'bg-amber-100 text-amber-700 border-amber-200',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function UserManagementDrawer({ isOpen, onClose }: UserManagementDrawerProps) {
    const [users, setUsers] = useState<User[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'VIEWER',
        password: '',
        is_active: true,
        department: '',
        phone: ''
    })
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    const loadData = async () => {
        try {
            setLoading(true)
            const [usersData, statsData] = await Promise.all([
                usersService.getUsers(),
                usersService.getUserStats()
            ])
            setUsers(usersData.users || [])
            setStats(statsData)
        } catch (error) {
            console.error('Failed to load users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddUser = async () => {
        if (!formData.email.trim() || !formData.full_name.trim() || !formData.password) {
            setFormError('Email, Full Name, and Password are required')
            return
        }

        try {
            setSubmitting(true)
            setFormError('')
            await usersService.createUser(formData)
            setShowAddModal(false)
            setFormData({ email: '', full_name: '', role: 'VIEWER', password: '', is_active: true, department: '', phone: '' })
            loadData()
        } catch (error: any) {
            setFormError(error.message || 'Failed to create user')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditUser = async () => {
        if (!editingUser) return

        try {
            setSubmitting(true)
            setFormError('')
            await usersService.updateUser(editingUser.id, {
                full_name: formData.full_name,
                role: formData.role,
                is_active: formData.is_active,
                department: formData.department,
                phone: formData.phone
            })

            setShowEditModal(false)
            setEditingUser(null)
            loadData()
        } catch (error: any) {
            setFormError(error.message || 'Failed to update user')
        } finally {
            setSubmitting(false)
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setFormData({
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            password: '',
            is_active: user.is_active,
            department: user.department || '',
            phone: user.phone || ''
        })
        setFormError('')
        setShowEditModal(true)
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = !roleFilter || user.role === roleFilter
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'inactive' && !user.is_active)
        return matchesSearch && matchesRole && matchesStatus
    })

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">User Management</h2>
                        <p className="text-blue-100 text-sm">Manage users, roles, and permissions</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Stats Bar */}
                {stats && (
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-900">{stats.total_users}</span>
                            <span className="text-sm text-slate-500">Total Users</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-green-600">{stats.active_users}</span>
                            <span className="text-sm text-slate-500">Active</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600">{stats.new_users_this_month}</span>
                            <span className="text-sm text-slate-500">New This Month</span>
                        </div>
                        <div className="flex-1" />
                        <button
                            onClick={() => {
                                setFormData({ email: '', full_name: '', role: 'VIEWER', password: '', is_active: true, department: '', phone: '' })
                                setFormError('')
                                setShowAddModal(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlusIcon />
                            Add User
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={roleFilter || ''}
                        onChange={(e) => setRoleFilter(e.target.value || null)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Roles</option>
                        {ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <UserIcon />
                            <p className="mt-2 text-slate-500">No users found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${user.is_active
                                        ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                                        : 'bg-slate-50 border-slate-200 opacity-70'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${user.is_active ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-slate-300 text-slate-600'
                                            }`}>
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">{user.full_name}</span>
                                                <Badge className={`text-xs border ${ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER}`}>
                                                    {user.role}
                                                </Badge>
                                                {!user.is_active && (
                                                    <Badge className="text-xs bg-slate-100 text-slate-600 border border-slate-200">Inactive</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                            {user.department && (
                                                <p className="text-xs text-slate-400">{user.department}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            <p className="text-slate-500">Last login</p>
                                            <p className="text-slate-700">
                                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <EditIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600">
                            <h2 className="text-lg font-bold text-white">Add New User</h2>
                        </div>
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="user@example.com"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        {ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Investigations"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="+234..."
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="add_is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="add_is_active" className="text-sm text-slate-700">Active</label>
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
                                onClick={handleAddUser}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
                            <h2 className="text-lg font-bold text-white">Edit User</h2>
                        </div>
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        {ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="edit_is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
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
                                onClick={handleEditUser}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
