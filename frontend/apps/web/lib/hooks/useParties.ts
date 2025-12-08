import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
type PartyType = 'SUSPECT' | 'VICTIM' | 'WITNESS' | 'COMPLAINANT'
type Gender = 'M' | 'F' | 'Other' | 'Unspecified'

interface Party {
  id: string
  case_id: string
  party_type: PartyType
  full_name?: string
  alias?: string
  dob?: string
  nationality?: string
  gender?: Gender
  national_id?: string
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  guardian_contact?: {
    name?: string
    phone?: string
    email?: string
    relationship?: string
  }
  safeguarding_flags?: string[]
  notes?: string
  created_at: string
  updated_at: string
}

interface CreatePartyInput {
  case_id: string
  party_type: PartyType
  full_name?: string
  alias?: string
  dob?: string
  nationality?: string
  gender?: Gender
  national_id?: string
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  guardian_contact?: {
    name?: string
    phone?: string
    email?: string
    relationship?: string
  }
  safeguarding_flags?: string[]
  notes?: string
}

interface UpdatePartyInput {
  party_type?: PartyType
  full_name?: string
  alias?: string
  dob?: string
  nationality?: string
  gender?: Gender
  national_id?: string
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  guardian_contact?: {
    name?: string
    phone?: string
    email?: string
    relationship?: string
  }
  safeguarding_flags?: string[]
  notes?: string
}

// API functions (to be implemented with actual API client)
const fetchParties = async (caseId: string): Promise<Party[]> => {
  return apiClient.get<Party[]>(`/parties/case/${caseId}`)
}

const createParty = async (input: CreatePartyInput): Promise<Party> => {
  return apiClient.post<Party>('/parties/', input)
}

const updateParty = async (partyId: string, input: UpdatePartyInput): Promise<Party> => {
  return apiClient.patch<Party>(`/parties/${partyId}/`, input)
}

const deleteParty = async (partyId: string): Promise<void> => {
  return apiClient.delete(`/parties/${partyId}/`)
}

// Hooks
export function useParties(caseId: string) {
  return useQuery({
    queryKey: ['parties', caseId],
    queryFn: () => fetchParties(caseId),
    enabled: !!caseId,
  })
}

export function usePartyMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreatePartyInput, 'case_id'>) =>
      createParty({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ partyId, input }: { partyId: string; input: UpdatePartyInput }) =>
      updateParty(partyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteParty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createParty: async (input: Omit<CreatePartyInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateParty: async (partyId: string, input: UpdatePartyInput) => {
      return updateMutation.mutateAsync({ partyId, input })
    },
    deleteParty: async (partyId: string) => {
      return deleteMutation.mutateAsync(partyId)
    },
    loading:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
