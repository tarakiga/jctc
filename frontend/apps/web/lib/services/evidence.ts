import { apiClient } from './api-client'

export interface Evidence {
  id: string
  evidence_number: string
  case_id: string
  case_number?: string
  case_title?: string
  type: string
  description: string
  file_path?: string
  file_hash?: string
  collected_date: string
  collected_by: string
  location_collected?: string
  chain_of_custody_status: string
  created_at: string
  updated_at: string
}

export interface CreateEvidenceData {
  case_id: string
  type: string
  description: string
  collected_date: string
  collected_by: string
  location_collected?: string
}

export interface UpdateEvidenceData extends Partial<CreateEvidenceData> {
  chain_of_custody_status?: string
}

export interface EvidenceFilters {
  search?: string
  case_id?: string
  type?: string
  chain_of_custody_status?: string
  page?: number
  limit?: number
}

export interface ChainOfCustodyEntry {
  id: string
  evidence_id: string
  action: string
  performed_by: string
  performed_at: string
  location?: string
  notes?: string
}

export const evidenceService = {
  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<{ evidence: Evidence[]; total: number }> {
    const params = new URLSearchParams()
    
    if (filters?.search) params.append('search', filters.search)
    if (filters?.case_id) params.append('case_id', filters.case_id)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.chain_of_custody_status) {
      params.append('chain_of_custody_status', filters.chain_of_custody_status)
    }
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const response = await apiClient.get(`/evidence?${params.toString()}`)
    // apiClient already unwraps response.data, so response IS the data
    // API returns { items, total }, transform to { evidence, total }
    return {
      evidence: response?.items || [],
      total: response?.total || 0
    }
  },

  /**
   * Get a single evidence item by ID
   */
  async getEvidenceById(id: string): Promise<Evidence> {
    const response = await apiClient.get(`/evidence/${id}`)
    return response
  },

  /**
   * Create new evidence (metadata only)
   */
  async createEvidence(data: CreateEvidenceData): Promise<Evidence> {
    const response = await apiClient.post('/evidence', data)
    return response
  },

  /**
   * Upload evidence file
   */
  async uploadEvidenceFile(evidenceId: string, file: File): Promise<Evidence> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/evidence/${evidenceId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  /**
   * Upload multiple evidence files at once
   */
  async uploadMultipleFiles(evidenceId: string, files: File[]): Promise<Evidence> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await apiClient.post(`/evidence/${evidenceId}/upload-multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  /**
   * Create evidence with file upload in one request
   */
  async createEvidenceWithFiles(
    data: CreateEvidenceData,
    files: File[]
  ): Promise<Evidence> {
    const formData = new FormData()
    
    // Append metadata
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString())
      }
    })
    
    // Append files
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await apiClient.post('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  /**
   * Update evidence metadata
   */
  async updateEvidence(id: string, data: UpdateEvidenceData): Promise<Evidence> {
    const response = await apiClient.put(`/evidence/${id}`, data)
    return response
  },

  /**
   * Delete evidence
   */
  async deleteEvidence(id: string): Promise<void> {
    await apiClient.delete(`/evidence/${id}`)
  },

  /**
   * Get chain of custody for evidence
   */
  async getChainOfCustody(evidenceId: string): Promise<ChainOfCustodyEntry[]> {
    const response = await apiClient.get(`/evidence/${evidenceId}/chain-of-custody`)
    return response
  },

  /**
   * Add chain of custody entry
   */
  async addChainOfCustodyEntry(
    evidenceId: string,
    data: {
      action: string
      location?: string
      notes?: string
    }
  ): Promise<ChainOfCustodyEntry> {
    const response = await apiClient.post(`/evidence/${evidenceId}/chain-of-custody`, data)
    return response
  },

  /**
   * Download evidence file
   */
  async downloadEvidence(evidenceId: string): Promise<Blob> {
    const response = await apiClient.get(`/evidence/${evidenceId}/download`, {
      responseType: 'blob',
    })
    return response
  },

  /**
   * Get evidence by case ID
   */
  async getEvidenceByCase(caseId: string): Promise<Evidence[]> {
    const response = await apiClient.get(`/cases/${caseId}/evidence`)
    return response
  },
}
