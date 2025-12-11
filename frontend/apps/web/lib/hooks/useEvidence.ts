import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../services/api-client"

// Backend-aligned types
export type CustodyStatus = "IN_VAULT" | "RELEASED" | "RETURNED" | "DISPOSED"
export type EvidenceCategory = "PHYSICAL" | "DIGITAL"
export type DeviceType =
  | "LAPTOP" | "DESKTOP" | "MOBILE_PHONE" | "TABLET"
  | "EXTERNAL_STORAGE" | "USB_DRIVE" | "MEMORY_CARD"
  | "SERVER" | "NETWORK_DEVICE" | "OTHER"
export type ImagingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VERIFIED"
export type DeviceCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED"
export type EncryptionStatus = "NONE" | "ENCRYPTED" | "BITLOCKER" | "FILEVAULT" | "PARTIAL" | "UNKNOWN"
export type AnalysisStatus = "PENDING" | "IN_PROGRESS" | "ANALYZED" | "BLOCKED"

export interface ChainOfCustodyEntry {
  id: string
  action: string
  to_user: string
  timestamp: string
  location?: string
  details?: string
}

export interface Evidence {
  id: string
  case_id?: string
  seizure_id?: string

  label: string
  category: EvidenceCategory
  evidence_type?: DeviceType

  // Identification
  make?: string
  model?: string
  serial_no?: string
  imei?: string

  // Specs
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string

  // Security
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus

  // Storage
  storage_location?: string
  retention_policy?: string
  custody_status: CustodyStatus

  // Imaging / Digital Specific
  imaged: boolean
  imaging_status: ImagingStatus
  imaging_started_at?: string
  imaging_completed_at?: string
  imaging_tool?: string
  image_hash?: string
  image_size_bytes?: string
  imaging_technician_id?: string

  // Metadata
  notes?: string
  forensic_notes?: string
  collected_at?: string
  collected_by?: string
  created_at: string
  updated_at?: string

  chain_entries?: ChainOfCustodyEntry[]
}

export interface CreateEvidenceInput {
  seizure_id: string
  label: string
  category: EvidenceCategory
  evidence_type?: DeviceType
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus
  storage_location?: string
  retention_policy?: string
  notes?: string
  forensic_notes?: string
  collected_at?: string
  collected_by?: string
}

export interface UpdateEvidenceInput {
  label?: string
  category?: EvidenceCategory
  evidence_type?: DeviceType
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus
  storage_location?: string
  retention_policy?: string
  notes?: string
  forensic_notes?: string
  collected_at?: string
}

// ==================== API FUNCTIONS ====================

const fetchEvidenceByCase = async (caseId: string): Promise<Evidence[]> => {
  // Use the new optimized endpoint
  const response = await apiClient.get<Evidence[]>(`/evidence/${caseId}/items`)
  return response || []
}

const fetchEvidenceBySeizure = async (seizureId: string): Promise<Evidence[]> => {
  const response = await apiClient.get<Evidence[]>(`/evidence/seizures/${seizureId}/items`)
  return response || []
}

// Fetch all evidence globally (across all cases)
export interface GlobalEvidenceFilters {
  category?: 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT'
  search?: string
  limit?: number
  offset?: number
}

const fetchAllEvidence = async (filters?: GlobalEvidenceFilters): Promise<Evidence[]> => {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.limit) params.append('limit', String(filters.limit))
  if (filters?.offset) params.append('offset', String(filters.offset))

  const queryString = params.toString()
  const url = queryString ? `/evidence?${queryString}` : '/evidence'

  const response = await apiClient.get<Evidence[]>(url)
  return response || []
}

const createEvidence = async (input: CreateEvidenceInput): Promise<Evidence> => {
  return apiClient.post<Evidence>(`/evidence/seizures/${input.seizure_id}/items`, input)
}

const updateEvidence = async (evidenceId: string, input: UpdateEvidenceInput): Promise<Evidence> => {
  return apiClient.put<Evidence>(`/evidence/${evidenceId}`, input)
}

const deleteEvidence = async (evidenceId: string): Promise<void> => {
  await apiClient.delete(`/evidence/${evidenceId}`)
}

// ==================== HOOKS ====================

export function useEvidence(caseId: string) {
  return useQuery({
    queryKey: ["evidence", "case", caseId],
    queryFn: () => fetchEvidenceByCase(caseId),
    enabled: !!caseId,
  })
}

export function useSeizureEvidence(seizureId: string) {
  return useQuery({
    queryKey: ["evidence", "seizure", seizureId],
    queryFn: () => fetchEvidenceBySeizure(seizureId),
    enabled: !!seizureId,
  })
}

// Global evidence listing hook
export function useAllEvidence(filters?: GlobalEvidenceFilters) {
  return useQuery({
    queryKey: ["evidence", "all", filters],
    queryFn: () => fetchAllEvidence(filters),
    staleTime: 30000, // 30 seconds
  })
}

export function useEvidenceMutations(caseId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["evidence", "case", caseId] })
    queryClient.invalidateQueries({ queryKey: ["seizures", caseId] }) // Seizures might show counts
  }

  const createMutation = useMutation({
    mutationFn: createEvidence,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEvidenceInput }) =>
      updateEvidence(id, data),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvidence,
    onSuccess: invalidate,
  })

  return {
    createEvidence: createMutation.mutateAsync,
    updateEvidence: updateMutation.mutateAsync,
    deleteEvidence: deleteMutation.mutateAsync,
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error
  }
}
