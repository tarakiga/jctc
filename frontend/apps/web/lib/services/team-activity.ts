import { apiClient } from './api-client'
import { 
  TeamActivity, 
  TeamActivityCreate, 
  TeamActivityUpdate, 
  TeamActivityFilter, 
  TeamActivityList,
  TeamActivityWithUser 
} from '@jctc/types'

// Re-export types for convenience
export type { TeamActivity, TeamActivityCreate, TeamActivityUpdate, TeamActivityFilter, TeamActivityList, TeamActivityWithUser }

export interface TeamActivityService {
  // List all team activities with optional filters
  listTeamActivities(filters?: TeamActivityFilter): Promise<TeamActivityWithUser[]>
  
  // Get a specific team activity by ID
  getTeamActivity(id: string): Promise<TeamActivityWithUser>
  
  // Create a new team activity (admin only)
  createTeamActivity(data: TeamActivityCreate): Promise<TeamActivityWithUser>
  
  // Update an existing team activity (admin only)
  updateTeamActivity(id: string, data: TeamActivityUpdate): Promise<TeamActivityWithUser>
  
  // Delete a team activity (admin only)
  deleteTeamActivity(id: string): Promise<void>
  
  // List team activities for a specific user
  listUserTeamActivities(userId: string): Promise<TeamActivityWithUser[]>
}

export const teamActivityService: TeamActivityService = {
  async listTeamActivities(filters?: TeamActivityFilter): Promise<TeamActivityWithUser[]> {
    const params = new URLSearchParams()
    
    if (filters?.activity_type) {
      params.append('activity_type', filters.activity_type)
    }
    if (filters?.user_id) {
      params.append('user_id', filters.user_id)
    }
    if (filters?.start_date) {
      params.append('start_date', filters.start_date)
    }
    if (filters?.end_date) {
      params.append('end_date', filters.end_date)
    }
    
    return await apiClient.get<TeamActivityWithUser[]>(`/team-activities?${params.toString()}`)
  },

  async getTeamActivity(id: string): Promise<TeamActivityWithUser> {
    return await apiClient.get<TeamActivityWithUser>(`/team-activities/${id}`)
  },

  async createTeamActivity(data: TeamActivityCreate): Promise<TeamActivityWithUser> {
    return await apiClient.post<TeamActivityWithUser>('/team-activities', data)
  },

  async updateTeamActivity(id: string, data: TeamActivityUpdate): Promise<TeamActivityWithUser> {
    return await apiClient.put<TeamActivityWithUser>(`/team-activities/${id}`, data)
  },

  async deleteTeamActivity(id: string): Promise<void> {
    await apiClient.delete(`/team-activities/${id}`)
  },

  async listUserTeamActivities(userId: string): Promise<TeamActivityWithUser[]> {
    return await apiClient.get<TeamActivityWithUser[]>(`/team-activities/user/${userId}`)
  }
}
