import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Types
type InstrumentType = 'WARRANT' | 'PRESERVATION' | 'MLAT' | 'COURT_ORDER'
type InstrumentStatus = 'REQUESTED' | 'ISSUED' | 'DENIED' | 'EXPIRED' | 'EXECUTED'

interface LegalInstrument {
  id: string
  case_id: string
  instrument_type: InstrumentType
  reference_no: string
  issuing_authority: string
  issued_at: string
  expires_at?: string
  status: InstrumentStatus
  scope_description: string
  document_file_name?: string
  document_file_size?: number
  document_hash?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
  created_by_name: string
}

interface CreateInstrumentInput {
  case_id: string
  instrument_type: InstrumentType
  reference_no: string
  issuing_authority: string
  issued_at: string
  expires_at?: string
  status: InstrumentStatus
  scope_description: string
  document?: File
  notes?: string
}

interface UpdateInstrumentInput {
  instrument_type?: InstrumentType
  reference_no?: string
  issuing_authority?: string
  issued_at?: string
  expires_at?: string
  status?: InstrumentStatus
  scope_description?: string
  notes?: string
}

// Helper function to compute SHA-256 hash
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// API functions (to be implemented with actual API client)
const fetchInstruments = async (caseId: string): Promise<LegalInstrument[]> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/cases/${caseId}/legal-instruments`)
  // return response.data
  
  // Mock data for visual review
  return [
    {
      id: 'instrument-001',
      case_id: caseId,
      instrument_type: 'WARRANT',
      reference_no: 'FHC/ABJ/CR/2025/0127',
      issuing_authority: 'Federal High Court, Abuja',
      issued_at: '2025-01-10T09:00:00Z',
      expires_at: '2025-02-10T23:59:59Z',
      status: 'ISSUED',
      scope_description: 'Search warrant for premises at Plot 45, Wuse Zone 2, Abuja. Authority to seize digital devices, documents, and records related to Business Email Compromise investigation. Includes laptops, phones, hard drives, USB devices, and financial documents.',
      document_file_name: 'search_warrant_fhc_abj_127_2025.pdf',
      document_file_size: 245678,
      document_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      notes: 'Warrant executed on 2025-01-11. Evidence seized and logged. Property owner served with copy of warrant.',
      created_at: '2025-01-09T14:30:00Z',
      updated_at: '2025-01-11T16:20:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'instrument-002',
      case_id: caseId,
      instrument_type: 'PRESERVATION',
      reference_no: 'JCTC/PRES/2025/0045',
      issuing_authority: 'JCTC - Digital Forensics Unit',
      issued_at: '2025-01-08T11:30:00Z',
      expires_at: '2025-04-08T23:59:59Z',
      status: 'EXECUTED',
      scope_description: 'Data preservation order to MTN Nigeria for subscriber information and call detail records for phone number +234-803-XXX-XXXX. Period: December 2024 to January 2025. Includes SMS, call logs, location data, and subscriber identity.',
      document_file_name: 'preservation_order_mtn_045.pdf',
      document_file_size: 198234,
      document_hash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      notes: 'MTN acknowledged preservation order on 2025-01-08. Data preserved and will be disclosed upon production order.',
      created_at: '2025-01-08T10:00:00Z',
      updated_at: '2025-01-08T15:45:00Z',
      created_by: 'user-004',
      created_by_name: 'Chukwuma Eze'
    },
    {
      id: 'instrument-003',
      case_id: caseId,
      instrument_type: 'COURT_ORDER',
      reference_no: 'FHC/ABJ/CR/2025/0127/ORD1',
      issuing_authority: 'Federal High Court, Abuja - Justice Adamu',
      issued_at: '2025-01-12T10:30:00Z',
      status: 'ISSUED',
      scope_description: 'Production order compelling MTN Nigeria to disclose preserved subscriber information and CDRs for phone number +234-803-XXX-XXXX. ISP to comply within 7 days of service.',
      document_file_name: 'production_order_mtn_127.pdf',
      document_file_size: 176543,
      document_hash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
      notes: 'Order served on MTN legal department 2025-01-13. Awaiting compliance.',
      created_at: '2025-01-12T11:00:00Z',
      updated_at: '2025-01-13T09:30:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'instrument-004',
      case_id: caseId,
      instrument_type: 'MLAT',
      reference_no: 'MLAT/USA/2025/0018',
      issuing_authority: 'Federal Ministry of Justice - International Cooperation',
      issued_at: '2025-01-14T08:00:00Z',
      status: 'REQUESTED',
      scope_description: 'Mutual Legal Assistance Treaty request to United States Department of Justice for subscriber information and transaction records from Coinbase related to cryptocurrency wallet addresses linked to suspect. Requesting IP logs, KYC documents, and transaction history for period Sep 2024 - Dec 2024.',
      document_file_name: 'mlat_request_usa_coinbase_018.pdf',
      document_file_size: 312456,
      document_hash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
      notes: 'MLAT request submitted via diplomatic channels. Typical response time: 3-6 months.',
      created_at: '2025-01-13T16:00:00Z',
      updated_at: '2025-01-14T08:00:00Z',
      created_by: 'user-001',
      created_by_name: 'Admin User'
    },
    {
      id: 'instrument-005',
      case_id: caseId,
      instrument_type: 'WARRANT',
      reference_no: 'FHC/ABJ/CR/2025/0127/ARR',
      issuing_authority: 'Federal High Court, Abuja',
      issued_at: '2025-01-16T14:00:00Z',
      status: 'ISSUED',
      scope_description: 'Arrest warrant for suspect: Chinedu Okafor (DOB: 1985-03-12, National ID: 12345678901). Charged with conspiracy to commit fraud, unauthorized access to computer systems, and money laundering under Cybercrimes Act 2015. Suspect to be held pending arraignment.',
      document_file_name: 'arrest_warrant_okafor_127.pdf',
      document_file_size: 189765,
      document_hash: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
      notes: 'Warrant issued. Suspect information circulated to all stations. Arrest pending.',
      created_at: '2025-01-16T14:30:00Z',
      updated_at: '2025-01-16T14:30:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'instrument-006',
      case_id: caseId,
      instrument_type: 'PRESERVATION',
      reference_no: 'JCTC/PRES/2025/0046',
      issuing_authority: 'JCTC - Digital Forensics Unit',
      issued_at: '2025-01-09T09:00:00Z',
      expires_at: '2025-01-23T23:59:59Z',
      status: 'EXPIRED',
      scope_description: 'Emergency data preservation order to WhatsApp (Meta) for chat logs and metadata for account +234-803-XXX-XXXX. Period: Nov 2024 - Jan 2025.',
      notes: 'Expired before production order could be obtained. Data may have been deleted by provider under retention policy.',
      created_at: '2025-01-09T08:30:00Z',
      updated_at: '2025-01-24T00:05:00Z',
      created_by: 'user-004',
      created_by_name: 'Chukwuma Eze'
    }
  ]
}

const createInstrument = async (input: CreateInstrumentInput): Promise<LegalInstrument> => {
  // TODO: Replace with actual API call
  // Process document upload and compute hash
  let document_hash: string | undefined
  let document_file_name: string | undefined
  let document_file_size: number | undefined

  if (input.document) {
    document_hash = await computeFileHash(input.document)
    document_file_name = input.document.name
    document_file_size = input.document.size
  }

  // const response = await apiClient.post(`/api/cases/${input.case_id}/legal-instruments`, {
  //   ...input,
  //   document_hash,
  //   document_file_name,
  //   document_file_size
  // })
  // return response.data

  throw new Error('API not implemented')
}

const updateInstrument = async (instrumentId: string, updates: UpdateInstrumentInput): Promise<LegalInstrument> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.patch(`/api/legal-instruments/${instrumentId}`, updates)
  // return response.data
  throw new Error('API not implemented')
}

const deleteInstrument = async (instrumentId: string): Promise<void> => {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/api/legal-instruments/${instrumentId}`)
  throw new Error('API not implemented')
}

// Hooks
export function useLegalInstruments(caseId: string) {
  return useQuery({
    queryKey: ['legal-instruments', caseId],
    queryFn: () => fetchInstruments(caseId),
    enabled: !!caseId,
  })
}

export function useLegalInstrumentMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateInstrumentInput, 'case_id'>) =>
      createInstrument({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-instruments', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateInstrumentInput }) =>
      updateInstrument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-instruments', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInstrument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-instruments', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createInstrument: async (input: Omit<CreateInstrumentInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateInstrument: async (id: string, updates: UpdateInstrumentInput) => {
      return updateMutation.mutateAsync({ id, updates })
    },
    deleteInstrument: async (id: string) => {
      return deleteMutation.mutateAsync(id)
    },
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
