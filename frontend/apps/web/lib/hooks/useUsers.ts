import { useState, useEffect } from 'react'
import { usersService, User, UserFilters, UserStats } from '../services/users'

export function useUsers(filters?: UserFilters) {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await usersService.getUsers(filters)
      setUsers(result.users)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [JSON.stringify(filters)])

  return {
    users,
    total,
    loading,
    error,
    refetch: fetchUsers,
  }
}

export function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const result = await usersService.getUser(id)
      setUser(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [id])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  }
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await usersService.getUserStats()
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user stats'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}

export function useUserMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createUser = async (data: Partial<User>): Promise<User | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await usersService.createUser(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create user'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (id: string, data: Partial<User>): Promise<User | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await usersService.updateUser(id, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update user'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      await usersService.deleteUser(id)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete user'))
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    createUser,
    updateUser,
    deleteUser,
    loading,
    error,
  }
}