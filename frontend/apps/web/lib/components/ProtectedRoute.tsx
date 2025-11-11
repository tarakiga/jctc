'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '@jctc/types'
import { usePermissions, Permission } from '../hooks/usePermissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRoles?: UserRole[]
  requiredPermissions?: Permission[]
  redirectTo?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRoles,
  requiredPermissions,
  redirectTo = '/login',
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { hasRole, hasAnyPermission } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => hasRole(role))
      if (!hasRequiredRole) {
        router.push('/unauthorized')
        return
      }
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermission = hasAnyPermission(...requiredPermissions)
      if (!hasRequiredPermission) {
        router.push('/unauthorized')
        return
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireAuth,
    requiredRoles,
    requiredPermissions,
    redirectTo,
    router,
    hasRole,
    hasAnyPermission,
  ])

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Don't render if not authenticated/authorized (will redirect)
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role))
    if (!hasRequiredRole) {
      return null
    }
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = hasAnyPermission(...requiredPermissions)
    if (!hasRequiredPermission) {
      return null
    }
  }

  return <>{children}</>
}
