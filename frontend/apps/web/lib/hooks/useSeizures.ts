import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
interface SeizurePhoto {
  id: string
  file_name: string
  file_size: number
  hash: string
  uploaded_at: string
}

interface Seizure {
  id: string
  case_id: string
  seized_at: string
  location: string
  officer_id: string
  officer_name: string
  witnesses: string[]
  notes?: string
  photos: SeizurePhoto[]
  created_at: string
  updated_at: string
  warrant_number?: string
  warrant_type?: string
  issuing_authority?: string
  description?: string
  items_count?: number
  status?: string
}

interface CreateSeizureInput {
  case_id: string
  seized_at?: string  // Optional - defaults to current time on backend
  location: string
  officer_id?: string  // Optional - defaults to current user on backend
  witnesses?: string[]  // Optional
  notes?: string
  legal_instrument_id?: string  // NEW: Link to authorizing legal instrument
  warrant_number?: string  // Deprecated
  warrant_type?: string  // Deprecated
  issuing_authority?: string  // Deprecated
  description?: string
  items_count?: number  // Deprecated: use evidence_count from response
  status?: string
  photos?: File[]
}

interface UpdateSeizureInput {
  seized_at?: string
  location?: string
  officer_id?: string
  witnesses?: string[]
  notes?: string
  legal_instrument_id?: string  // NEW
  warrant_number?: string  // Deprecated
  warrant_type?: string  // Deprecated
  issuing_authority?: string  // Deprecated
  description?: string
  items_count?: number  // Deprecated
  status?: string
}

// Helper function to compute SHA-256 hash
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// API functions wired to backend
const fetchSeizures = async (caseId: string): Promise<Seizure[]> => {
  const data = await apiClient.get<unknown[]>(`/evidence/${caseId}/seizures`)
  return (data || []).map((s: any) => ({
    id: String(s.id),
    case_id: String(s.case_id ?? caseId),
    seized_at: s.seized_at,
    location: s.location,
    officer_id: String(s.officer_id || ''),
    officer_name: '',
    witnesses: s.witnesses || [], // Ensure witnesses are passed back if stored as JSON
    notes: s.notes || '',
    photos: s.photos || [],
    created_at: s.created_at,
    updated_at: s.updated_at,
    warrant_number: s.warrant_number,
    warrant_type: s.warrant_type,
    issuing_authority: s.issuing_authority,
    description: s.description,
    items_count: s.items_count,
    status: s.status,
  }))
}

const createSeizure = async (input: CreateSeizureInput): Promise<Seizure> => {
  // Compute photo hashes for future use (backend does not accept photos yet in this simplified schema)
  // Logic remains similar but pointing to new endpoint

  const payload = {
    seized_at: input.seized_at,
    location: input.location,
    officer_id: input.officer_id,
    notes: input.notes,
    legal_instrument_id: input.legal_instrument_id,  // NEW: Link to legal instrument
    warrant_number: input.warrant_number,
    warrant_type: input.warrant_type,
    issuing_authority: input.issuing_authority,
    description: input.description,
    items_count: input.items_count,  // Deprecated but still accepted
    status: input.status,
    witnesses: input.witnesses ? input.witnesses.map(w => ({ name: w })) : [], // Simple format?
  }

  const s = await apiClient.post<any>(`/evidence/${input.case_id}/seizures`, payload)

  return {
    id: String(s.id),
    case_id: String(s.case_id ?? input.case_id),
    seized_at: s.seized_at,
    location: s.location,
    officer_id: String(s.officer_id || ''),
    officer_name: '',
    witnesses: input.witnesses || [],
    notes: s.notes || '',
    photos: [],
    created_at: s.created_at,
    updated_at: s.updated_at,
  }
}

const updateSeizure = async (seizureId: string, input: UpdateSeizureInput): Promise<Seizure> => {
  const payload: any = {
    seized_at: input.seized_at,
    location: input.location,
    officer_id: input.officer_id,
    notes: input.notes,
    warrant_number: input.warrant_number,
    warrant_type: input.warrant_type,
    issuing_authority: input.issuing_authority,
    description: input.description,
    items_count: input.items_count,
    status: input.status,
  }
  const s = await apiClient.put<any>(`/evidence/seizures/${seizureId}`, payload)
  return {
    id: String(s.id),
    case_id: String(s.case_id || ''),
    seized_at: s.seized_at,
    location: s.location,
    officer_id: String(s.officer_id || ''),
    officer_name: '',
    witnesses: [],
    notes: s.notes || '',
    photos: [],
    created_at: s.created_at,
    updated_at: s.updated_at,
  }
}

const deleteSeizure = async (seizureId: string): Promise<void> => {
  await apiClient.delete(`/evidence/seizures/${seizureId}`)
}

// Hooks
export function useSeizures(caseId: string) {
  return useQuery({
    queryKey: ['seizures', caseId],
    queryFn: () => fetchSeizures(caseId),
    enabled: !!caseId,
  })
}

export function useSeizureMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateSeizureInput, 'case_id'>) =>
      createSeizure({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seizures', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ seizureId, input }: { seizureId: string; input: UpdateSeizureInput }) =>
      updateSeizure(seizureId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seizures', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSeizure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seizures', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createSeizure: createMutation.mutateAsync,
    updateSeizure: updateMutation.mutateAsync,
    deleteSeizure: deleteMutation.mutateAsync,
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
