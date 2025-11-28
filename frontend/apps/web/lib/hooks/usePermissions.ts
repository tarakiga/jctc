'use client'

import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '@jctc/types'

/**
 * Role hierarchy for permission checking
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.INTAKE]: 1,
  [UserRole.LIAISON]: 2,
  [UserRole.FORENSIC]: 3,
  [UserRole.INVESTIGATOR]: 4,
  [UserRole.PROSECUTOR]: 5,
  [UserRole.SUPERVISOR]: 6,
  [UserRole.ADMIN]: 7,
}

/**
 * Permission definitions for different actions
 */
const PERMISSIONS = {
  // Case permissions
  'cases:view': [
    UserRole.INTAKE,
    UserRole.INVESTIGATOR,
    UserRole.FORENSIC,
    UserRole.PROSECUTOR,
    UserRole.LIAISON,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  ],
  'cases:create': [
    UserRole.INTAKE,
    UserRole.INVESTIGATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  ],
  'cases:edit': [UserRole.INVESTIGATOR, UserRole.SUPERVISOR, UserRole.ADMIN],
  'cases:delete': [UserRole.SUPERVISOR, UserRole.ADMIN],
  'cases:assign': [UserRole.SUPERVISOR, UserRole.ADMIN],

  // Evidence permissions
  'evidence:view': [
    UserRole.INVESTIGATOR,
    UserRole.FORENSIC,
    UserRole.PROSECUTOR,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  ],
  'evidence:add': [UserRole.INVESTIGATOR, UserRole.FORENSIC, UserRole.SUPERVISOR, UserRole.ADMIN],
  'evidence:edit': [UserRole.FORENSIC, UserRole.SUPERVISOR, UserRole.ADMIN],
  'evidence:delete': [UserRole.SUPERVISOR, UserRole.ADMIN],
  'evidence:verify': [UserRole.FORENSIC, UserRole.SUPERVISOR, UserRole.ADMIN],

  // User management
  'users:view': [UserRole.SUPERVISOR, UserRole.ADMIN],
  'users:create': [UserRole.ADMIN],
  'users:edit': [UserRole.ADMIN],
  'users:delete': [UserRole.ADMIN],

  // Reports
  'reports:view': [
    UserRole.INVESTIGATOR,
    UserRole.PROSECUTOR,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  ],
  'reports:generate': [UserRole.SUPERVISOR, UserRole.ADMIN],

  // Analytics
  'analytics:view': [UserRole.SUPERVISOR, UserRole.ADMIN],

  // System settings
  'settings:view': [UserRole.ADMIN],
  'settings:edit': [UserRole.ADMIN],
} as const

export type Permission = keyof typeof PERMISSIONS

export function usePermissions() {
  const { user } = useAuth()

  /**
   * Check if user has a specific permission
   */
  function hasPermission(permission: Permission): boolean {
    if (!user) return false

    const allowedRoles = PERMISSIONS[permission] as readonly UserRole[]
    return allowedRoles.includes(user.role)
  }

  /**
   * Check if user has any of the specified permissions
   */
  function hasAnyPermission(...permissions: Permission[]): boolean {
    return permissions.some((permission) => hasPermission(permission))
  }

  /**
   * Check if user has all of the specified permissions
   */
  function hasAllPermissions(...permissions: Permission[]): boolean {
    return permissions.every((permission) => hasPermission(permission))
  }

  /**
   * Check if user has a specific role or higher
   */
  function hasRoleOrHigher(role: UserRole): boolean {
    if (!user) return false

    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[role]
  }

  /**
   * Check if user has specific role
   */
  function hasRole(role: UserRole): boolean {
    if (!user) return false

    return user.role === role
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasRoleOrHigher,
  }
}
