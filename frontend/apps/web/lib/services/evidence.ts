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
  storage_location?: string
  chain_of_custody_status: string
  notes?: string
  files?: any[]
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
  // Extended fields for comprehensive custody tracking
  custodian_from?: string
  custodian_to?: string
  location_from?: string
  location_to?: string
  purpose?: string
  signature_path?: string
  signature_verified?: boolean
  requires_approval?: boolean
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  approved_by?: string
  approval_timestamp?: string
  created_by?: string
  created_at?: string
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

    const response = await apiClient.get<{ items?: Evidence[]; total?: number }>(`/evidence?${params.toString()}`)
    // API returns { items, total }, transform to { evidence, total }
    return {
      evidence: response?.items || [],
      total: response?.total || 0
    }
  },

  /**
   * Approve chain of custody entry (four-eyes approval)
   */
  async approveChainOfCustodyEntry(
    evidenceId: string,
    entryId: string
  ): Promise<ChainOfCustodyEntry> {
    return await apiClient.post<ChainOfCustodyEntry>(`/evidence/${evidenceId}/chain-of-custody/${entryId}/approve`)
  },

  /**
   * Reject chain of custody entry
   */
  async rejectChainOfCustodyEntry(
    evidenceId: string,
    entryId: string,
    reason?: string
  ): Promise<ChainOfCustodyEntry> {
    return await apiClient.post<ChainOfCustodyEntry>(`/evidence/${evidenceId}/chain-of-custody/${entryId}/reject`, {
      reason
    })
  },

  /**
   * Generate custody transfer receipt
   */
  async generateCustodyReceipt(evidenceId: string, entryId: string): Promise<string> {
    const response = await apiClient.get<{ receipt_url: string }>(`/evidence/${evidenceId}/chain-of-custody/${entryId}/receipt`)
    return response.receipt_url
  },

  /**
   * Get a single evidence item by ID
   */
  async getEvidenceById(id: string): Promise<Evidence> {
    return await apiClient.get<Evidence>(`/evidence/${id}`)
  },

  /**
   * Create new evidence (metadata only)
   */
  async createEvidence(data: CreateEvidenceData): Promise<Evidence> {
    return await apiClient.post<Evidence>('/evidence', data)
  },

  /**
   * Upload evidence file
   */
  async uploadEvidenceFile(evidenceId: string, file: File): Promise<Evidence> {
    const formData = new FormData()
    formData.append('file', file)

    return await apiClient.post<Evidence>(`/evidence/${evidenceId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * Upload multiple evidence files at once
   */
  async uploadMultipleFiles(evidenceId: string, files: File[]): Promise<Evidence> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    return await apiClient.post<Evidence>(`/evidence/${evidenceId}/upload-multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
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

    return await apiClient.post<Evidence>('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * Update evidence metadata
   */
  async updateEvidence(id: string, data: UpdateEvidenceData): Promise<Evidence> {
    return await apiClient.put<Evidence>(`/evidence/${id}`, data)
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
    return await apiClient.get<ChainOfCustodyEntry[]>(`/evidence/${evidenceId}/chain-of-custody`)
  },

  /**
   * Add chain of custody entry
   */
  async addChainOfCustodyEntry(
    evidenceId: string,
    data: {
      action: string
      custodian_from?: string
      custodian_to?: string
      location_from?: string
      location_to?: string
      location?: string
      purpose?: string
      notes?: string
      signature_path?: string
      signature_verified?: boolean
      requires_approval?: boolean
      approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
      timestamp?: string
    }
  ): Promise<ChainOfCustodyEntry> {
    return await apiClient.post<ChainOfCustodyEntry>(`/evidence/${evidenceId}/chain-of-custody`, data)
  },

  /**
   * Download evidence file
   */
  async downloadEvidence(evidenceId: string): Promise<Blob> {
    return await apiClient.get<Blob>(`/evidence/${evidenceId}/download`, {
      responseType: 'blob',
    } as any)
  },

  /**
   * Get evidence by case ID
   */
  async getEvidenceByCase(caseId: string): Promise<Evidence[]> {
    return await apiClient.get<Evidence[]>(`/cases/${caseId}/evidence`)
  },
}
