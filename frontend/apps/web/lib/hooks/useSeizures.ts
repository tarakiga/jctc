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
}

interface CreateSeizureInput {
  case_id: string
  seized_at: string
  location: string
  officer_id: string
  witnesses: string[]
  notes?: string
  photos?: File[]
}

interface UpdateSeizureInput {
  seized_at?: string
  location?: string
  officer_id?: string
  witnesses?: string[]
  notes?: string
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
  const data = await apiClient.get<unknown[]>(`/devices/${caseId}/seizures`)
  return (data || []).map((s: any) => ({
    id: String(s.id),
    case_id: String(s.case_id ?? caseId),
    seized_at: s.seized_at,
    location: s.location,
    officer_id: String(s.officer_id || ''),
    officer_name: '',
    witnesses: [],
    notes: s.notes || '',
    photos: [],
    created_at: s.created_at,
    updated_at: s.updated_at,
  }))
}

const createSeizure = async (input: CreateSeizureInput): Promise<Seizure> => {
  // Compute photo hashes for future use (backend does not accept photos yet)
  const photos: SeizurePhoto[] = []
  if (input.photos && input.photos.length > 0) {
    for (const file of input.photos) {
      const hash = await computeFileHash(file)
      photos.push({
        id: `photo-${Math.random().toString(36).substr(2, 9)}`,
        file_name: file.name,
        file_size: file.size,
        hash,
        uploaded_at: new Date().toISOString(),
      })
    }
  }

  const payload = {
    seized_at: input.seized_at,
    location: input.location,
    officer_id: input.officer_id,
    notes: input.notes,
  }

  const s = await apiClient.post<any>(`/devices/${input.case_id}/seizures`, payload)

  return {
    id: String(s.id),
    case_id: String(s.case_id ?? input.case_id),
    seized_at: s.seized_at,
    location: s.location,
    officer_id: String(s.officer_id || ''),
    officer_name: '',
    witnesses: input.witnesses || [],
    notes: s.notes || '',
    photos,
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
  }
  const s = await apiClient.put<any>(`/devices/seizures/${seizureId}`, payload)
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
  await apiClient.delete(`/devices/seizures/${seizureId}`)
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
    createSeizure: async (input: Omit<CreateSeizureInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateSeizure: async (seizureId: string, input: UpdateSeizureInput) => {
      return updateMutation.mutateAsync({ seizureId, input })
    },
    deleteSeizure: async (seizureId: string) => {
      return deleteMutation.mutateAsync(seizureId)
    },
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
