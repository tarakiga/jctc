'use client'

import { useState, useEffect } from 'react'
import { Badge, Button } from '@jctc/ui'
import { usersService, User, UserStats } from '@/lib/services/users'
import {
    X, Plus, Search, Edit2, Trash2, UserPlus,
    Shield, Mail, Phone, Briefcase, CheckCircle, XCircle,
    ArrowLeft, MoreVertical, Building, Users
} from 'lucide-react'

interface UserManagementDrawerProps {
    isOpen: boolean
    onClose: () => void
}

const ROLES = ['ADMIN', 'SUPERVISOR', 'PROSECUTOR', 'LIAISON', 'FORENSIC', 'INVESTIGATOR', 'INTAKE']

const ROLE_STYLES: Record<string, { bg: string, text: string, border: string }> = {
    ADMIN: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    SUPERVISOR: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    PROSECUTOR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    LIAISON: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    FORENSIC: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    INVESTIGATOR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    INTAKE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    VIEWER: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }
}

export function UserManagementDrawer({ isOpen, onClose }: UserManagementDrawerProps) {
    // Data State
    const [users, setUsers] = useState<User[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [loading, setLoading] = useState(true)

    // UI State
    const [view, setView] = useState<'list' | 'form'>('list')
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Form/Edit State
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'INTAKE',
        password: '',
        is_active: true,
        department: '',
        phone: ''
    })
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingUser, setDeletingUser] = useState<User | null>(null)


    useEffect(() => {
        if (isOpen) {
            loadData()
            setView('list')
            setEditingUser(null)
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

    const handleOpenCreate = () => {
        setEditingUser(null)
        setFormData({
            email: '',
            full_name: '',
            role: 'INTAKE',
            password: '',
            is_active: true,
            department: '',
            phone: ''
        })
        setFormError('')
        setView('form')
    }

    const handleOpenEdit = (user: User) => {
        setEditingUser(user)
        setFormData({
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            password: '', // Password optional on edit
            is_active: user.is_active,
            department: user.department || '',
            phone: user.phone || ''
        })
        setFormError('')
        setView('form')
    }

    const handleSubmit = async () => {
        if (!formData.email.trim() || !formData.full_name.trim()) {
            setFormError('Email and Full Name are required')
            return
        }
        if (!editingUser && !formData.password) {
            setFormError('Password is required for new users')
            return
        }

        try {
            setSubmitting(true)
            setFormError('')

            if (editingUser) {
                await usersService.updateUser(editingUser.id, {
                    full_name: formData.full_name,
                    role: formData.role,
                    is_active: formData.is_active,
                    department: formData.department,
                    phone: formData.phone
                })
            } else {
                await usersService.createUser({
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role,
                    password: formData.password,
                    is_active: formData.is_active,
                    org_unit: formData.department // Map frontend 'department' to backend 'org_unit'
                })
            }

            await loadData()
            setView('list')
        } catch (error: any) {
            setFormError(error.message || 'Failed to save user')
        } finally {
            setSubmitting(false)
        }
    }

    const openDeleteModal = (user: User) => {
        setDeletingUser(user)
        setShowDeleteModal(true)
    }

    const handleDeleteUser = async () => {
        if (!deletingUser) return

        try {
            setSubmitting(true)
            await usersService.deleteUser(deletingUser.id)
            setShowDeleteModal(false)
            setDeletingUser(null)
            loadData()
        } catch (error: any) {
            setFormError(error.message || 'Failed to delete user')
        } finally {
            setSubmitting(false)
        }
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right sm:border-l sm:border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            User Management
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Manage team access and permissions</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 relative">

                    {/* VIEW: LIST */}
                    {view === 'list' && (
                        <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">

                            {/* Stats Cards */}
                            {stats && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-6 pb-2">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">Total Users</p>
                                            <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Users className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">Active Users</p>
                                            <p className="text-2xl font-bold text-green-600">{stats.active_users}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">New (Month)</p>
                                            <p className="text-2xl font-bold text-indigo-600">{stats.new_users_this_month}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filters & Actions */}
                            <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                        />
                                    </div>
                                    <select
                                        value={roleFilter || ''}
                                        onChange={(e) => setRoleFilter(e.target.value || null)}
                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                    >
                                        <option value="">All Roles</option>
                                        {ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <Button
                                    onClick={handleOpenCreate}
                                    className="bg-black hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all duration-200"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add User
                                </Button>
                            </div>

                            {/* User List Table */}
                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3">User</th>
                                                <th className="px-6 py-3">Role</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Last Login</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loading ? (
                                                [1, 2, 3, 4, 5].map(i => (
                                                    <tr key={i} className="animate-pulse">
                                                        <td className="px-6 py-4"><div className="h-10 w-40 bg-slate-100 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-100 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                                                        <td className="px-6 py-4"></td>
                                                    </tr>
                                                ))
                                            ) : filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                                <Users className="w-6 h-6 text-slate-300" />
                                                            </div>
                                                            <p className="font-medium">No users found</p>
                                                            <p className="text-xs mt-1">Try adjusting your filters</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((user) => {
                                                    const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.VIEWER
                                                    return (
                                                        <tr key={user.id} className="group hover:bg-slate-50/80 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`
                                                                        w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm
                                                                        ${user.is_active ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}
                                                                    `}>
                                                                        {user.full_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-slate-900">{user.full_name}</div>
                                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                                        {user.department && (
                                                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                                                <Briefcase className="w-3 h-3" />
                                                                                {user.department}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`
                                                                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                                    ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}
                                                                `}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {user.is_active ? (
                                                                    <div className="flex items-center gap-1.5 status-badge-active">
                                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                                        <span className="text-xs font-medium text-green-700">Active</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 status-badge-inactive">
                                                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                                        <span className="text-xs font-medium text-slate-500">Inactive</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                                        onClick={() => handleOpenEdit(user)}
                                                                        title="Edit User"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => openDeleteModal(user)}
                                                                        title="Delete User"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: FORM */}
                    {view === 'form' && (
                        <div className="absolute inset-0 flex flex-col bg-slate-50 animate-in slide-in-from-right duration-300">
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
                                        {editingUser ? 'Edit User Profile' : 'Invite New Team Member'}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {editingUser ? `Updating details for ${editingUser.full_name}` : 'Fill in the details below'}
                                    </p>
                                </div>
                            </div>

                            {/* Form Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

                                    {/* Avatar Column */}
                                    <div className="md:col-span-1">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                                            <div className={`
                                                w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold shadow-inner mb-4
                                                ${formData.is_active ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}
                                            `}>
                                                {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : <Users className="w-10 h-10 opacity-50" />}
                                            </div>
                                            <h4 className="font-bold text-slate-900 truncate">
                                                {formData.full_name || 'New User'}
                                            </h4>
                                            <p className="text-xs text-slate-500 truncate mb-4">
                                                {formData.email || 'No email set'}
                                            </p>
                                            <div className="flex items-center justify-center gap-2 text-xs font-medium bg-slate-50 py-2 rounded-lg border border-slate-100">
                                                <Badge className={ROLE_STYLES[formData.role].text + ' ' + ROLE_STYLES[formData.role].bg + ' border-0'}>
                                                    {formData.role}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inputs Column */}
                                    <div className="md:col-span-2 space-y-6">
                                        {/* Account Details */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <Shield className="w-4 h-4 text-blue-500" />
                                                Account & Role
                                            </h4>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            disabled={!!editingUser}
                                                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                                                            placeholder="navin@johnson.com"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                                        <select
                                                            value={formData.role}
                                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                        >
                                                            {ROLES.map(role => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                                        <select
                                                            value={formData.is_active ? 'active' : 'inactive'}
                                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {!editingUser && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Initial Password</label>
                                                        <input
                                                            type="password"
                                                            value={formData.password}
                                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Profile Details */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <Users className="w-4 h-4 text-indigo-500" />
                                                Personal Information
                                            </h4>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.full_name}
                                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                        placeholder="Navin Johnson"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                                        <div className="relative">
                                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                value={formData.department}
                                                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                                placeholder="e.g. Forensics"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type="tel"
                                                                value={formData.phone}
                                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                                placeholder="+1..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {formError && (
                                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
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
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="min-w-[120px] bg-black hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all duration-200"
                                >
                                    {submitting ? 'Saving...' : editingUser ? 'Save Profile' : 'Send Invite'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation (Premium Modal) */}
            {showDeleteModal && deletingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Delete User</h2>
                                <p className="text-sm text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 mb-4">
                                Are you sure you want to permanently delete <strong className="text-slate-900">{deletingUser.full_name}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3">
                                <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-800">
                                    This will remove all their access immediately. Historical records may be preserved for audit.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md shadow-red-500/20 transition-all"
                            >
                                {submitting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
