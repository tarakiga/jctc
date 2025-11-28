import { useState, useEffect } from 'react'
import { 
  teamActivityService, 
  TeamActivityWithUser, 
  TeamActivityCreate, 
  TeamActivityUpdate, 
  TeamActivityFilter 
} from '../services/team-activity'

export function useTeamActivities(filters?: TeamActivityFilter) {
  const [activities, setActivities] = useState<TeamActivityWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await teamActivityService.listTeamActivities(filters)
      setActivities(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team activities'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [JSON.stringify(filters)])

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  }
}

export function useTeamActivity(id: string) {
  const [activity, setActivity] = useState<TeamActivityWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchActivity = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await teamActivityService.getTeamActivity(id)
      setActivity(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team activity'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchActivity()
    }
  }, [id])

  return {
    activity,
    loading,
    error,
    refetch: fetchActivity,
  }
}

export function useUserTeamActivities(userId: string) {
  const [activities, setActivities] = useState<TeamActivityWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUserActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await teamActivityService.listUserTeamActivities(userId)
      setActivities(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user team activities'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUserActivities()
    }
  }, [userId])

  return {
    activities,
    loading,
    error,
    refetch: fetchUserActivities,
  }
}

export function useCreateTeamActivity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createActivity = async (data: TeamActivityCreate): Promise<TeamActivityWithUser> => {
    try {
      setLoading(true)
      setError(null)
      const result = await teamActivityService.createTeamActivity(data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create team activity')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    createActivity,
    loading,
    error,
  }
}

export function useUpdateTeamActivity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateActivity = async (id: string, data: TeamActivityUpdate): Promise<TeamActivityWithUser> => {
    try {
      setLoading(true)
      setError(null)
      const result = await teamActivityService.updateTeamActivity(id, data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update team activity')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    updateActivity,
    loading,
    error,
  }
}

export function useDeleteTeamActivity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteActivity = async (id: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      await teamActivityService.deleteTeamActivity(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete team activity')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    deleteActivity,
    loading,
    error,
  }
}