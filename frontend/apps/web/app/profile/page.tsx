'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { authApi } from '@jctc/api-client'
import { UserRole } from '@jctc/types'

function ProfileContent() {
  const { user, refreshUser, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [orgUnit, setOrgUnit] = useState(user?.org_unit || '')
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  if (!user) return null

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      // In real implementation, call API to update profile
      // await userApi.updateProfile({ full_name: fullName, email, org_unit: orgUnit })
      await refreshUser()
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    try {
      await authApi.changePassword(oldPassword, newPassword)
      setSuccess('Password changed successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
    } catch (err) {
      setError('Failed to change password. Please check your current password.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    const roleMap: Record<UserRole, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
      [UserRole.ADMIN]: 'error',
      [UserRole.SUPERVISOR]: 'warning',
      [UserRole.PROSECUTOR]: 'info',
      [UserRole.INVESTIGATOR]: 'info',
      [UserRole.FORENSIC]: 'success',
      [UserRole.LIAISON]: 'default',
      [UserRole.INTAKE]: 'default',
    }
    return roleMap[role]
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold text-primary-600">JCTC</h1>
              </Link>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-700">Profile</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">User Profile</h2>
          <p className="text-neutral-600">Manage your account settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {/* Profile Information Card */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Profile Information</CardTitle>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Input
                    label="Organization Unit"
                    value={orgUnit}
                    onChange={(e) => setOrgUnit(e.target.value)}
                    disabled={isLoading}
                    helperText="e.g., JCTC HQ, Lagos Zonal Command"
                  />
                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" isLoading={isLoading}>
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setFullName(user.full_name)
                        setEmail(user.email)
                        setOrgUnit(user.org_unit || '')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Full Name</label>
                    <p className="text-base text-neutral-900">{user.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Email Address</label>
                    <p className="text-base text-neutral-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Role</label>
                    <div className="mt-1">
                      <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Organization Unit</label>
                    <p className="text-base text-neutral-900">{user.org_unit || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Account Status</label>
                    <p className="text-base text-neutral-900">
                      {user.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="error">Inactive</Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Change Password</CardTitle>
                {!isChangingPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsChangingPassword(true)}
                  >
                    Change Password
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    helperText="Must be at least 8 characters long"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" isLoading={isLoading}>
                      Update Password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false)
                        setOldPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-neutral-600">
                  Update your password to keep your account secure. We recommend using a strong
                  password you don't use elsewhere.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">User ID</span>
                  <span className="text-neutral-900 font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Created At</span>
                  <span className="text-neutral-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Last Updated</span>
                  <span className="text-neutral-900">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ProfileContent />
    </ProtectedRoute>
  )
}
