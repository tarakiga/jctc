'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@jctc/api-client'
import type { User, LoginRequest } from '@jctc/types'
import { SessionExpiredModal } from '@/components/auth/SessionExpiredModal'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const router = useRouter()

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  // Listen for session-expired events from API client
  useEffect(() => {
    const handleSessionExpired = () => {
      // Only show modal if user was previously authenticated
      if (user) {
        setShowSessionExpired(true)
      }
    }

    window.addEventListener('session-expired', handleSessionExpired)
    return () => window.removeEventListener('session-expired', handleSessionExpired)
  }, [user])

  async function loadUser() {
    try {
      setIsLoading(true)
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      // Not authenticated or token expired
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(credentials: LoginRequest) {
    try {
      const response = await authApi.login(credentials)
      setUser(response.user)
      setShowSessionExpired(false) // Clear any session expired state
      router.push('/dashboard')
    } catch (error) {
      throw error
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      setShowSessionExpired(false)
      router.push('/login')
    }
  }

  const handleSessionExpiredClose = useCallback(() => {
    setShowSessionExpired(false)
  }, [])

  const handleSessionExpiredLogout = useCallback(() => {
    setUser(null)
    setShowSessionExpired(false)
  }, [])

  async function refreshUser() {
    await loadUser()
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        isOpen={showSessionExpired}
        onClose={handleSessionExpiredClose}
        onLogout={handleSessionExpiredLogout}
        countdownSeconds={60}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
