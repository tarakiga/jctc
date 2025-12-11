import { apiClient } from './api-client'

// Enum types matching backend
export type IntakeChannel = 'WALK_IN' | 'HOTLINE' | 'EMAIL' | 'REFERRAL' | 'API' | 'ONLINE_FORM' | 'PARTNER_AGENCY'
export type ReporterType = 'ANONYMOUS' | 'VICTIM' | 'PARENT' | 'LEA' | 'NGO' | 'CORPORATE' | 'WHISTLEBLOWER'
export type RiskFlag = 'CHILD_SAFETY' | 'IMMINENT_HARM' | 'TRAFFICKING' | 'SEXTORTION' | 'FINANCIAL_CRITICAL' | 'HIGH_PROFILE' | 'CROSS_BORDER'

export interface ReporterContact {
  phone?: string
  email?: string
}

// NEW: Reporter as Party (consolidated approach)
export interface ReporterParty {
  party_type: string  // VICTIM, COMPLAINANT, etc.
  full_name?: string
  contact?: ReporterContact
  notes?: string
}

export interface Case {
  id: string
  case_number: string
  title: string
  description: string
  severity: number
  status: string
  case_type?: string
  date_reported: string
  lead_investigator?: string
  local_or_international?: string
  originating_country?: string
  cooperating_countries?: string[]
  created_at: string
  updated_at: string
  // Intake fields
  intake_channel?: IntakeChannel
  risk_flags?: string[]
  platforms_implicated?: string[]
  lga_state_location?: string
  incident_datetime?: string
  // Reporter fields (legacy)
  reporter_type?: ReporterType
  reporter_name?: string
  reporter_contact?: ReporterContact
  // NEW: Reporter as Party
  reporter?: ReporterParty
}

export interface CreateCaseData {
  title: string
  description: string
  severity: number
  case_type?: string
  status?: string  // Initial status (e.g., OPEN, PENDING)
  date_reported?: string
  local_or_international: 'LOCAL' | 'INTERNATIONAL'
  originating_country?: string
  cooperating_countries?: string[]
  // Intake fields
  intake_channel?: IntakeChannel
  risk_flags?: string[]
  platforms_implicated?: string[]
  lga_state_location?: string
  incident_datetime?: string
  // Reporter fields (legacy - still accepted)
  reporter_type?: ReporterType
  reporter_name?: string
  reporter_contact?: ReporterContact
  // NEW: Reporter as Party (preferred)
  reporter?: ReporterParty
}

export interface UpdateCaseData extends Partial<CreateCaseData> {
  status?: string
  lead_investigator?: string
}

export interface CaseFilters {
  search?: string
  status?: string
  severity?: number
  local_or_international?: string
  skip?: number
  limit?: number
}

export const casesService = {
  /**
   * Get all cases with optional filters
   */
  async getCases(filters?: CaseFilters): Promise<{ cases: Case[], total: number }> {
    const params = new URLSearchParams()

    if (filters?.search) params.append('search', filters.search)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.severity) params.append('severity', filters.severity.toString())
    if (filters?.local_or_international) params.append('local_or_international', filters.local_or_international)
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    const response = await apiClient.get(`/cases/${queryString ? `?${queryString}` : ''}`)
    // apiClient already unwraps response.data, so response IS the data
    const casesData = Array.isArray(response) ? response : []
    return {
      cases: casesData,
      total: casesData.length
    }
  },

  /**
   * Get a single case by ID
   */
  async getCase(id: string): Promise<Case> {
    return await apiClient.get<Case>(`/cases/${id}/`)
  },

  /**
   * Create a new case
   */
  async createCase(data: CreateCaseData): Promise<Case> {
    return await apiClient.post<Case>('/cases/', data)
  },

  /**
   * Update an existing case
   */
  async updateCase(id: string, data: UpdateCaseData): Promise<Case> {
    return await apiClient.put<Case>(`/cases/${id}/`, data)
  },

  /**
   * Delete a case
   */
  async deleteCase(id: string): Promise<void> {
    await apiClient.delete(`/cases/${id}/`)
  },

  /**
   * Get case statistics
   */
  async getCaseStats(): Promise<{
    total: number
    by_status: Record<string, number>
    by_severity: Record<number, number>
    recent_cases: Case[]
  }> {
    return await apiClient.get<{
      total: number
      by_status: Record<string, number>
      by_severity: Record<number, number>
      recent_cases: Case[]
    }>('/cases/stats/')
  },

  /**
   * Assign investigator to case
   */
  async assignInvestigator(caseId: string, userId: string): Promise<Case> {
    return await apiClient.post<Case>(`/cases/${caseId}/assign/`, { user_id: userId })
  },

  /**
   * Update case status
   */
  async updateStatus(caseId: string, status: string): Promise<Case> {
    return await apiClient.patch<Case>(`/cases/${caseId}/status/`, { status })
  },
}
