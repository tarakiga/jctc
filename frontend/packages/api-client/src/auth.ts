/**
 * Authentication API
 */

import { apiClient } from './lib/client'
import type { LoginRequest, LoginResponse, User } from '@jctc/types'

export const authApi = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.getClient().post<LoginResponse>('/auth/login', credentials)

    // Store tokens
    apiClient.setAccessToken(data.access_token)
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', data.refresh_token)
    }

    return data
  },

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await apiClient.getClient().post('/auth/logout')
    } finally {
      apiClient.clearTokens()
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.getClient().get<User>('/auth/me')
    return data
  },

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.getClient().post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.getClient().post('/auth/forgot-password', { email })
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.getClient().post('/auth/reset-password', {
      token,
      new_password: newPassword,
    })
  },
}
