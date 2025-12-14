'use client'

import { Button, Badge } from '@jctc/ui'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { UserRole } from '@jctc/types'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface AuthenticatedLayoutProps {
  children: ReactNode
}

function AuthenticatedLayoutContent({ children }: AuthenticatedLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  // Map role to color variant
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

  const isActive = (path: string) => {
    if (!pathname) return false
    // Treat exact match and nested routes as active
    if (pathname === path) return true
    return pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-xl transition-all overflow-hidden">
                  {/* Using public/logo.png. Replace this file with your crest to update. */}
                  <Image
                    src="/logo.png"
                    alt="JCTC logo"
                    width={40}
                    height={40}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">JCTC</h1>
                  <p className="text-xs text-slate-500 font-medium">Case Management</p>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/dashboard')
                      ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/cases"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/cases')
                      ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Cases
                </Link>
                <Link
                  href="/evidence"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/evidence')
                      ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Evidence
                </Link>
                <Link
                  href="/reports"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/reports')
                      ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Reports
                </Link>
                <Link
                  href="/compliance"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/compliance')
                      ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Compliance
                </Link>
                {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) && (
                  <Link
                    href="/admin"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/admin')
                        ? 'text-primary-700 bg-primary-100 hover:bg-primary-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Search */}
              <button className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search...</span>
                <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white rounded border border-slate-300">
                  ⌘K
                </kbd>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="mt-0.5">
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-semibold text-slate-700 hover:shadow-lg transition-all">
                  {user.full_name.charAt(0)}
                </button>
                <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:flex">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <ProtectedRoute requireAuth={true}>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </ProtectedRoute>
  )
}
