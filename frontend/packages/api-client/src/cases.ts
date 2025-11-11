/**
 * Cases API
 */

import { apiClient } from './lib/client'
import type {
  Case,
  CaseCreate,
  CaseUpdate,
  CaseListFilters,
  PaginatedResponse,
} from '@jctc/types'

export const casesApi = {
  /**
   * List cases with filters and pagination
   */
  async list(filters?: CaseListFilters): Promise<Case[]> {
    const params = new URLSearchParams()

    if (filters?.status) params.append('status', filters.status)
    if (filters?.local_or_international)
      params.append('local_or_international', filters.local_or_international)
    if (filters?.severity) params.append('severity', filters.severity.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString())
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString())

    const { data } = await apiClient.getClient().get<Case[]>(`/cases?${params.toString()}`)
    return data
  },

  /**
   * Get a single case by ID
   */
  async get(id: string): Promise<Case> {
    const { data } = await apiClient.getClient().get<Case>(`/cases/${id}`)
    return data
  },

  /**
   * Create a new case
   */
  async create(caseData: CaseCreate): Promise<Case> {
    const { data } = await apiClient.getClient().post<Case>('/cases', caseData)
    return data
  },

  /**
   * Update an existing case
   */
  async update(id: string, caseData: CaseUpdate): Promise<Case> {
    const { data } = await apiClient.getClient().put<Case>(`/cases/${id}`, caseData)
    return data
  },

  /**
   * Delete a case
   */
  async delete(id: string): Promise<void> {
    await apiClient.getClient().delete(`/cases/${id}`)
  },
}
