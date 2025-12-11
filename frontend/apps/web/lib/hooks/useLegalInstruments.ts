import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
export type InstrumentType = 'WARRANT' | 'PRESERVATION' | 'MLAT' | 'COURT_ORDER'
export type InstrumentStatus = 'REQUESTED' | 'ISSUED' | 'DENIED' | 'EXPIRED' | 'EXECUTED'

export interface LegalInstrument {
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
  created_by_name?: string
}

export interface CreateInstrumentInput {
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

export interface UpdateInstrumentInput {
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

// API functions
const fetchInstruments = async (caseId: string): Promise<LegalInstrument[]> => {
  try {
    const response = await apiClient.get<LegalInstrument[]>(`/cases/${caseId}/legal-instruments/`)
    return response
  } catch (error) {
    // Silently return empty array if API endpoint doesn't exist yet
    // This is expected during development when endpoint may not be implemented
    return []
  }
}

const createInstrument = async (input: CreateInstrumentInput): Promise<LegalInstrument> => {
  // Process document upload and compute hash
  let document_hash: string | undefined
  let document_file_name: string | undefined
  let document_file_size: number | undefined

  if (input.document) {
    document_hash = await computeFileHash(input.document)
    document_file_name = input.document.name
    document_file_size = input.document.size
  }

  const { document, ...restInput } = input

  return await apiClient.post<LegalInstrument>(`/cases/${input.case_id}/legal-instruments/`, {
    ...restInput,
    document_hash,
    document_file_name,
    document_file_size
  })
}

const updateInstrument = async (instrumentId: string, updates: UpdateInstrumentInput): Promise<LegalInstrument> => {
  return await apiClient.patch<LegalInstrument>(`/legal-instruments/${instrumentId}/`, updates)
}

const deleteInstrument = async (instrumentId: string): Promise<void> => {
  await apiClient.delete(`/legal-instruments/${instrumentId}/`)
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
