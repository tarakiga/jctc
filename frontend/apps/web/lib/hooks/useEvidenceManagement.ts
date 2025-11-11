import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Evidence types
type EvidenceCategory = 'DIGITAL' | 'PHYSICAL' | 'DOCUMENT'
type RetentionPolicy = 'PERMANENT' | 'CASE_CLOSE_PLUS_7' | 'CASE_CLOSE_PLUS_1' | 'DESTROY_AFTER_TRIAL'

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
  purpose: string
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
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/evidence`)
  // return response.json()
  
  // Mock data for demonstration
  return [
    {
      id: 'ev-001',
      case_id: caseId,
      evidence_number: 'EVD-2025-A7X9K',
      label: 'Laptop - HP EliteBook 840',
      category: 'DIGITAL',
      description: 'Suspect\'s primary work laptop containing email correspondence and financial records',
      storage_location: 'Vault A, Shelf 3, Box 12',
      sha256_hash: 'a3f5e9d2c8b7f1a4e6d8c2b5a9f3e7d1c4b8a2f6e9d3c7b1a5f8e2d6c9b4a7f1',
      file_path: 'laptop_image_20250116.dd',
      file_size: 512000000000, // 512 GB
      retention_policy: 'CASE_CLOSE_PLUS_7',
      collected_by: 'user-001',
      collected_by_name: 'Jane Smith',
      collected_at: '2025-01-16',
      notes: 'Device was powered on when seized. Battery at 45%. Device imaged using FTK Imager.',
      created_at: '2025-01-16T09:30:00Z',
      updated_at: '2025-01-16T09:30:00Z',
    },
    {
      id: 'ev-002',
      case_id: caseId,
      evidence_number: 'EVD-2025-B8Y2M',
      label: 'iPhone 14 Pro - Space Black',
      category: 'PHYSICAL',
      description: 'Mobile phone used for communication with co-conspirators',
      storage_location: 'Vault A, Shelf 2, Locker 5',
      sha256_hash: 'b4e6f8a1d9c3e5b7f2a8d4c6b9e3f7a1d5c8b2e6f9a3d7c1b5e8f2a6d9c3b7e1',
      file_path: 'iphone_extraction_20250117.tar',
      file_size: 64000000000, // 64 GB
      retention_policy: 'PERMANENT',
      collected_by: 'user-002',
      collected_by_name: 'Michael Chen',
      collected_at: '2025-01-17',
      notes: 'Phone was locked. Passcode obtained via warrant. Full extraction completed using Cellebrite.',
      created_at: '2025-01-17T10:00:00Z',
      updated_at: '2025-01-17T10:00:00Z',
    },
    {
      id: 'ev-003',
      case_id: caseId,
      evidence_number: 'EVD-2025-C9Z3N',
      label: 'Bank Statements and Transaction Records',
      category: 'DOCUMENT',
      description: 'Physical bank statements showing suspicious wire transfers',
      storage_location: 'Document Archive, Cabinet D, Drawer 7',
      retention_policy: 'CASE_CLOSE_PLUS_7',
      collected_by: 'user-003',
      collected_by_name: 'Sarah Johnson',
      collected_at: '2025-01-18',
      notes: 'Documents provided by bank in response to subpoena. 47 pages total.',
      created_at: '2025-01-18T14:30:00Z',
      updated_at: '2025-01-18T14:30:00Z',
    },
  ]
}

async function createEvidenceItem(
  caseId: string,
  evidence: Omit<EvidenceItem, 'id' | 'evidence_number' | 'created_at' | 'updated_at' | 'case_id' | 'collected_by' | 'collected_by_name' | 'qr_code'>
): Promise<EvidenceItem> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/evidence`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(evidence),
  // })
  // return response.json()
  
  // Mock response
  return {
    ...evidence,
    id: Math.random().toString(36).substr(2, 9),
    evidence_number: `EVD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    case_id: caseId,
    collected_by: 'current-user-id',
    collected_by_name: 'Current User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as EvidenceItem
}

async function updateEvidenceItem(
  caseId: string,
  evidenceId: string,
  updates: Partial<EvidenceItem>
): Promise<EvidenceItem> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates),
  // })
  // return response.json()
  
  // Mock response
  return {
    id: evidenceId,
    case_id: caseId,
    ...updates,
    updated_at: new Date().toISOString(),
  } as EvidenceItem
}

async function deleteEvidenceItem(caseId: string, evidenceId: string): Promise<void> {
  // TODO: Replace with actual API call
  // await fetch(`/api/cases/${caseId}/evidence/${evidenceId}`, {
  //   method: 'DELETE',
  // })
  
  return Promise.resolve()
}

async function generateQRCode(caseId: string, evidenceId: string): Promise<string> {
  // TODO: Replace with actual API call that generates QR code
  // const response = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/qr-code`)
  // const data = await response.json()
  // return data.qr_code_url
  
  // Mock QR code data URL (simple placeholder)
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23fff'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14' font-family='monospace'%3EQR Code%3C/text%3E%3C/svg%3E`
}

async function verifyHash(caseId: string, evidenceId: string): Promise<boolean> {
  // TODO: Replace with actual API call that re-computes hash and compares
  // const response = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/verify-hash`)
  // const data = await response.json()
  // return data.is_valid
  
  // Mock verification (always returns true for now)
  return Promise.resolve(true)
}

// API functions for Chain of Custody
async function fetchCustodyEntries(evidenceId: string): Promise<CustodyEntry[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/evidence/${evidenceId}/custody`)
  // return response.json()
  
  // Mock data - different custody chains for different evidence items
  const mockCustodyData: Record<string, CustodyEntry[]> = {
    'ev-001': [
      {
        id: 'custody-001',
        evidence_id: evidenceId,
        action: 'SEIZED',
        to_person: 'user-001',
        to_person_name: 'Jane Smith',
        location: 'Crime Scene - ABC Corp Office, Floor 3, Room 301',
        purpose: 'Initial seizure during search warrant execution',
        notes: 'Device was powered on. Photographed in situ. Placed in Faraday bag immediately. Seal #A7X9K-001 applied.',
        signature_verified: true,
        timestamp: '2025-01-16T09:30:00Z',
        performed_by: 'user-001',
        performed_by_name: 'Jane Smith',
      },
      {
        id: 'custody-002',
        evidence_id: evidenceId,
        action: 'TRANSFERRED',
        from_person: 'user-001',
        from_person_name: 'Jane Smith',
        to_person: 'user-002',
        to_person_name: 'Michael Chen',
        location: 'Evidence Room A - JCTC Headquarters',
        purpose: 'Transfer to digital forensics lab for imaging',
        notes: 'Seal integrity verified - intact. Device still in Faraday bag. Logged into evidence management system at 14:15.',
        signature_verified: true,
        timestamp: '2025-01-16T14:15:00Z',
        performed_by: 'user-001',
        performed_by_name: 'Jane Smith',
      },
      {
        id: 'custody-003',
        evidence_id: evidenceId,
        action: 'ANALYZED',
        from_person: 'user-002',
        from_person_name: 'Michael Chen',
        to_person: 'user-002',
        to_person_name: 'Michael Chen',
        location: 'Digital Forensics Lab - Room 204',
        purpose: 'Forensic imaging and data extraction',
        notes: 'Created forensic image using FTK Imager v7.4. SHA-256 hash computed and verified. Original device resealed with new seal #A7X9K-002.',
        signature_verified: true,
        timestamp: '2025-01-17T10:00:00Z',
        performed_by: 'user-002',
        performed_by_name: 'Michael Chen',
      },
      {
        id: 'custody-004',
        evidence_id: evidenceId,
        action: 'TRANSFERRED',
        from_person: 'user-002',
        from_person_name: 'Michael Chen',
        to_person: 'user-003',
        to_person_name: 'Sarah Johnson',
        location: 'Secure Storage Vault B',
        purpose: 'Long-term secure storage pending trial',
        notes: 'Analysis complete. Original device returned to secure storage. Climate-controlled environment. Seal verified intact.',
        signature_verified: true,
        timestamp: '2025-01-17T16:45:00Z',
        performed_by: 'user-002',
        performed_by_name: 'Michael Chen',
      },
      {
        id: 'custody-005',
        evidence_id: evidenceId,
        action: 'PRESENTED_COURT',
        from_person: 'user-003',
        from_person_name: 'Sarah Johnson',
        to_person: 'user-003',
        to_person_name: 'Sarah Johnson',
        location: 'Federal High Court, Courtroom 5',
        purpose: 'Presentation as evidence in trial proceedings',
        notes: 'Device presented to court with forensic report. Judge inspected seal. Defense counsel verified integrity.',
        signature_verified: true,
        timestamp: '2025-01-25T11:20:00Z',
        performed_by: 'user-003',
        performed_by_name: 'Sarah Johnson',
      },
    ],
    'ev-002': [
      {
        id: 'custody-006',
        evidence_id: evidenceId,
        action: 'COLLECTED',
        to_person: 'user-002',
        to_person_name: 'Michael Chen',
        location: 'Suspect Residence - 123 Main Street, Lagos',
        purpose: 'Collection during consent search',
        notes: 'Device voluntarily surrendered by suspect. Photographed. Placed in evidence bag. Seal #B8Y2M-001 applied.',
        signature_verified: true,
        timestamp: '2025-01-17T10:00:00Z',
        performed_by: 'user-002',
        performed_by_name: 'Michael Chen',
      },
      {
        id: 'custody-007',
        evidence_id: evidenceId,
        action: 'ANALYZED',
        from_person: 'user-002',
        from_person_name: 'Michael Chen',
        to_person: 'user-002',
        to_person_name: 'Michael Chen',
        location: 'Mobile Forensics Lab - Room 205',
        purpose: 'Data extraction using Cellebrite Premium',
        notes: 'Full file system extraction completed. Messages, call logs, photos extracted. Hash values verified.',
        signature_verified: true,
        timestamp: '2025-01-17T15:30:00Z',
        performed_by: 'user-002',
        performed_by_name: 'Michael Chen',
      },
      {
        id: 'custody-008',
        evidence_id: evidenceId,
        action: 'RETURNED',
        from_person: 'user-002',
        from_person_name: 'Michael Chen',
        to_person: 'user-004',
        to_person_name: 'David Brown',
        location: 'Evidence Return Office',
        purpose: 'Return to owner after case closure',
        notes: 'Case closed with conviction. Device no longer needed. All data extracted and preserved.',
        signature_verified: true,
        timestamp: '2025-02-15T09:00:00Z',
        performed_by: 'user-002',
        performed_by_name: 'Michael Chen',
        requires_approval: true,
        approval_status: 'PENDING',
      },
    ],
    'ev-003': [
      {
        id: 'custody-009',
        evidence_id: evidenceId,
        action: 'COLLECTED',
        to_person: 'user-003',
        to_person_name: 'Sarah Johnson',
        location: 'First Bank Nigeria - Corporate Office',
        purpose: 'Collection of subpoenaed documents',
        notes: 'Bank compliance officer provided sealed envelope containing 47 pages of statements. Envelope photographed before opening.',
        signature_verified: true,
        timestamp: '2025-01-18T14:30:00Z',
        performed_by: 'user-003',
        performed_by_name: 'Sarah Johnson',
      },
      {
        id: 'custody-010',
        evidence_id: evidenceId,
        action: 'TRANSFERRED',
        from_person: 'user-003',
        from_person_name: 'Sarah Johnson',
        to_person: 'user-005',
        to_person_name: 'Emily White',
        location: 'Document Archive - JCTC Building B',
        purpose: 'Long-term document storage',
        notes: 'Documents scanned and digitized. Originals stored in climate-controlled archive. Catalog #DOC-2025-789.',
        signature_verified: true,
        timestamp: '2025-01-19T11:00:00Z',
        performed_by: 'user-003',
        performed_by_name: 'Sarah Johnson',
      },
    ],
  }
  
  return mockCustodyData[evidenceId] || []
}

async function createCustodyEntry(
  evidenceId: string,
  entry: Omit<CustodyEntry, 'id' | 'timestamp' | 'performed_by' | 'performed_by_name' | 'evidence_id'>
): Promise<CustodyEntry> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/evidence/${evidenceId}/custody`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(entry),
  // })
  // return response.json()
  
  // Mock response
  return {
    ...entry,
    id: Math.random().toString(36).substr(2, 9),
    evidence_id: evidenceId,
    performed_by: 'current-user-id',
    performed_by_name: 'Current User',
    timestamp: new Date().toISOString(),
  } as CustodyEntry
}

async function approveCustodyEntry(evidenceId: string, entryId: string): Promise<CustodyEntry> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/evidence/${evidenceId}/custody/${entryId}/approve`, {
  //   method: 'POST',
  // })
  // return response.json()
  
  // Mock response
  return {
    id: entryId,
    evidence_id: evidenceId,
    approval_status: 'APPROVED',
    approved_by: 'current-user-id',
    approved_by_name: 'Current User',
    approval_timestamp: new Date().toISOString(),
  } as CustodyEntry
}

async function rejectCustodyEntry(evidenceId: string, entryId: string): Promise<CustodyEntry> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/evidence/${evidenceId}/custody/${entryId}/reject`, {
  //   method: 'POST',
  // })
  // return response.json()
  
  // Mock response
  return {
    id: entryId,
    evidence_id: evidenceId,
    approval_status: 'REJECTED',
    approved_by: 'current-user-id',
    approved_by_name: 'Current User',
    approval_timestamp: new Date().toISOString(),
  } as CustodyEntry
}

async function generateCustodyReceipt(evidenceId: string, entryId: string): Promise<string> {
  // TODO: Replace with actual API call that generates PDF receipt
  // const response = await fetch(`/api/evidence/${evidenceId}/custody/${entryId}/receipt`)
  // const data = await response.json()
  // return data.receipt_url
  
  // Mock receipt URL
  return Promise.resolve(`/mock-receipt-${entryId}.pdf`)
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

  const generateReceiptMutation = useMutation({
    mutationFn: (entryId: string) => generateCustodyReceipt(evidenceId, entryId),
  })

  return {
    addCustodyEntry: createMutation.mutateAsync,
    approveEntry: approveMutation.mutateAsync,
    rejectEntry: rejectMutation.mutateAsync,
    generateReceipt: generateReceiptMutation.mutateAsync,
    isAdding: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
