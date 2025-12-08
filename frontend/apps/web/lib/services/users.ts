import { apiClient } from './api-client'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string
  department?: string
  phone?: string
}

export interface UserStats {
  total_users: number
  active_users: number
  users_by_role: Record<string, number>
  new_users_this_month: number
  last_month_comparison: number
}

export interface UserFilters {
  role?: string
  is_active?: boolean
  search?: string
  skip?: number
  limit?: number
}

export const usersService = {
  /**
   * Get all users with optional filters
   */
  async getUsers(filters?: UserFilters): Promise<{ users: User[], total: number }> {
    const params = new URLSearchParams()
    
    if (filters?.role) params.append('role', filters.role)
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    const response = await apiClient.get(`/users/${queryString ? `?${queryString}` : ''}`)
    
    const usersData = Array.isArray(response) ? response : []
    return {
      users: usersData,
      total: usersData.length
    }
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get('/users/stats')
    return response as UserStats
  },

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`)
    return response as User
  },

  /**
   * Create a new user
   */
  async createUser(data: Partial<User>): Promise<User> {
    const response = await apiClient.post('/users', data)
    return response as User
  },

  /**
   * Update an existing user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.put(`/users/${id}`, data)
    return response as User
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`)
  }
}