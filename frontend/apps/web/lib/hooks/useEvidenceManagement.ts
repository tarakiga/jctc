import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Evidence types
type EvidenceCategory = 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT' | string // Relaxed for dynamic values
type RetentionPolicy = 'PERMANENT' | 'CASE_CLOSE_PLUS_7' | 'CASE_CLOSE_PLUS_1' | 'DESTROY_AFTER_TRIAL' | string // Relaxed for dynamic values

interface EvidenceItem {
  id: string
  case_id: string
  evidence_number: string
  label: string
  category: EvidenceCategory
  description?: string
  storage_location?: string
  sha256_hash?: string
  file_path?: string
  file_size?: number
  retention_policy: RetentionPolicy
  collected_by: string
  collected_by_name: string
  collected_at: string
  notes?: string
  qr_code?: string
  created_at: string
  updated_at: string
  files?: File[]
}

// Chain of custody types
type CustodyAction =
  | 'COLLECTED'
  | 'SEIZED'
  | 'TRANSFERRED'
  | 'ANALYZED'
  | 'PRESENTED_COURT'
  | 'RETURNED'
  | 'DISPOSED'

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface CustodyEntry {
  id: string
  evidence_id: string
  action: CustodyAction
  from_person?: string
  from_person_name?: string
  to_person: string
  to_person_name: string
  location: string
  purpose?: string
  notes?: string
  signature_path?: string
  signature_verified: boolean
  timestamp: string
  performed_by: string
  performed_by_name: string
  requires_approval?: boolean
  approval_status?: ApprovalStatus
  approved_by?: string
  approved_by_name?: string
  approval_timestamp?: string
}

// API functions for Evidence Items
async function fetchEvidenceItems(caseId: string): Promise<EvidenceItem[]> {
  const response = await apiClient.get<{ items: any[] }>(`/evidence?case_id=${caseId}`)
  return (response.items || []).map(item => ({
    ...item,
    category: item.type || item.category, // Map type from API to category
    sha256_hash: item.sha256 || item.sha256_hash, // Map sha256 from API to sha256_hash
    collected_by_name: item.collected_by_name || 'System' // Fallback for name
  })) as EvidenceItem[]
}

async function createEvidenceItem(
  caseId: string,
  evidence: Omit<EvidenceItem, 'id' | 'evidence_number' | 'created_at' | 'updated_at' | 'case_id' | 'collected_by' | 'collected_by_name' | 'qr_code'>
): Promise<EvidenceItem> {
  // Check if we have files to upload
  if (evidence.files && evidence.files.length > 0) {
    const formData = new FormData()
    formData.append('case_id', caseId)
    formData.append('label', evidence.label)
    formData.append('category', evidence.category)
    formData.append('description', evidence.description || '')
    formData.append('notes', evidence.notes || '')
    formData.append('storage_location', evidence.storage_location || '')
    formData.append('retention_policy', evidence.retention_policy)
    formData.append('collected_at', evidence.collected_at)

    // Append files
    evidence.files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await apiClient.post<EvidenceItem>('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  } else {
    // Standard JSON creation
    // Combine case_id with evidence data
    const payload = { ...evidence, case_id: caseId }
    const response = await apiClient.post<EvidenceItem>('/evidence', payload)
    return response
  }
}

async function updateEvidenceItem(
  caseId: string, // Kept for signature compatibility but unused
  evidenceId: string,
  updates: Partial<EvidenceItem>
): Promise<EvidenceItem> {
  const response = await apiClient.put<EvidenceItem>(`/evidence/${evidenceId}`, updates)
  return response
}

async function deleteEvidenceItem(caseId: string, evidenceId: string): Promise<void> {
  await apiClient.delete(`/evidence/${evidenceId}`)
}

async function generateQRCode(caseId: string, evidenceId: string): Promise<string> {
  const response = await apiClient.get<{ qr_code_url: string }>(`/cases/${caseId}/evidence/${evidenceId}/qr-code`)
  return response.qr_code_url
}

async function verifyHash(caseId: string, evidenceId: string): Promise<boolean> {
  const response = await apiClient.get<{ is_valid: boolean }>(`/cases/${caseId}/evidence/${evidenceId}/verify-hash`)
  return response.is_valid
}

// API functions for Chain of Custody
async function fetchCustodyEntries(evidenceId: string): Promise<CustodyEntry[]> {
  const response = await apiClient.get<any[]>(`/evidence/${evidenceId}/custody`)
  return response.map(item => ({
    id: item.id,
    evidence_id: item.evidence_id,
    action: item.action,
    from_person: item.custodian_from,
    from_person_name: item.custodian_from_name,
    to_person: item.custodian_to,
    to_person_name: item.custodian_to_name,
    location: item.location_to,
    purpose: item.purpose,
    notes: item.notes || item.purpose, // Map purpose to notes if notes absent
    timestamp: item.timestamp,
    performed_by: item.created_by,
    performed_by_name: item.created_by_name,
    signature_verified: item.signature_verified,
    requires_approval: item.requires_approval,
    approval_status: item.approval_status,
    approved_by: item.approved_by,
    approved_by_name: item.approved_by_name,
    approval_timestamp: item.approval_timestamp
  }))
}

async function createCustodyEntry(
  evidenceId: string,
  entry: Omit<CustodyEntry, 'id' | 'timestamp' | 'performed_by' | 'performed_by_name' | 'evidence_id'>
): Promise<CustodyEntry> {
  const payload = {
    evidence_id: evidenceId,
    action: entry.action,
    custodian_from: entry.from_person,
    custodian_to: entry.to_person,
    location_to: entry.location,
    purpose: entry.notes || entry.purpose || '', // Use notes as purpose
    notes: entry.notes
  }

  const response = await apiClient.post<any>(`/evidence/${evidenceId}/custody`, payload)

  return {
    id: response.id,
    evidence_id: response.evidence_id,
    action: response.action,
    from_person: response.custodian_from,
    from_person_name: response.custodian_from_name,
    to_person: response.custodian_to,
    to_person_name: response.custodian_to_name,
    location: response.location_to,
    purpose: response.purpose,
    notes: response.notes,
    timestamp: response.timestamp,
    performed_by: response.created_by,
    performed_by_name: response.created_by_name,
    signature_verified: response.signature_verified,
    requires_approval: response.requires_approval,
    approval_status: response.approval_status
  }
}

async function approveCustodyEntry(evidenceId: string, entryId: string): Promise<CustodyEntry> {
  const response = await apiClient.post<CustodyEntry>(`/evidence/${evidenceId}/custody/${entryId}/approve`)
  return response
}

async function rejectCustodyEntry(evidenceId: string, entryId: string): Promise<CustodyEntry> {
  const response = await apiClient.post<CustodyEntry>(`/evidence/${evidenceId}/custody/${entryId}/reject`)
  return response
}

async function generateCustodyReceipt(evidenceId: string, entryId: string): Promise<string> {
  const response = await apiClient.get<{ receipt_url: string }>(`/evidence/${evidenceId}/custody/${entryId}/receipt`)
  return response.receipt_url
}

async function deleteCustodyEntry(evidenceId: string, entryId: string): Promise<void> {
  await apiClient.delete(`/evidence/${evidenceId}/custody/${entryId}`)
}

// Hooks for Evidence Items
export function useEvidenceItems(caseId: string) {
  return useQuery({
    queryKey: ['evidence-items', caseId],
    queryFn: () => fetchEvidenceItems(caseId),
    enabled: !!caseId,
  })
}

export function useEvidenceItemMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (evidence: Omit<EvidenceItem, 'id' | 'evidence_number' | 'created_at' | 'updated_at' | 'case_id' | 'collected_by' | 'collected_by_name' | 'qr_code'>) =>
      createEvidenceItem(caseId, evidence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ evidenceId, updates }: { evidenceId: string; updates: Partial<EvidenceItem> }) =>
      updateEvidenceItem(caseId, evidenceId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (evidenceId: string) => deleteEvidenceItem(caseId, evidenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items', caseId] })
    },
  })

  const generateQRMutation = useMutation({
    mutationFn: (evidenceId: string) => generateQRCode(caseId, evidenceId),
  })

  const verifyHashMutation = useMutation({
    mutationFn: (evidenceId: string) => verifyHash(caseId, evidenceId),
  })

  return {
    createEvidence: createMutation.mutateAsync,
    updateEvidence: (id: string, updates: Partial<EvidenceItem>) => updateMutation.mutateAsync({ evidenceId: id, updates }),
    deleteEvidence: deleteMutation.mutateAsync,
    generateQR: generateQRMutation.mutateAsync,
    verifyHash: verifyHashMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// Hooks for Chain of Custody
export function useChainOfCustody(evidenceId: string) {
  return useQuery({
    queryKey: ['custody-entries', evidenceId],
    queryFn: () => fetchCustodyEntries(evidenceId),
    enabled: !!evidenceId,
  })
}

export function useCustodyMutations(evidenceId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (entry: Omit<CustodyEntry, 'id' | 'timestamp' | 'performed_by' | 'performed_by_name' | 'evidence_id'>) =>
      createCustodyEntry(evidenceId, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-entries', evidenceId] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (entryId: string) => approveCustodyEntry(evidenceId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-entries', evidenceId] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (entryId: string) => rejectCustodyEntry(evidenceId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-entries', evidenceId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteCustodyEntry(evidenceId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-entries', evidenceId] })
    },
  })

  const generateReceiptMutation = useMutation({
    mutationFn: (entryId: string) => generateCustodyReceipt(evidenceId, entryId),
  })

  return {
    addCustodyEntry: createMutation.mutateAsync,
    approveEntry: approveMutation.mutateAsync,
    rejectEntry: rejectMutation.mutateAsync,
    deleteCustodyEntry: deleteMutation.mutateAsync,
    generateReceipt: generateReceiptMutation.mutateAsync,
    isAdding: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
