import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/cases/${caseId}/parties`)
  // return response.data
  
  // Mock data for visual review
  return [
    {
      id: 'party-001',
      case_id: caseId,
      party_type: 'SUSPECT',
      full_name: 'Chidinma Okafor',
      alias: 'DigiQueen',
      dob: '1995-08-15',
      nationality: 'Nigerian',
      gender: 'F',
      national_id: 'A1234567890',
      contact: {
        phone: '+234-803-456-7890',
        email: 'c.okafor@example.com',
        address: '45 Allen Avenue, Ikeja, Lagos State',
      },
      safeguarding_flags: ['Flight Risk', 'International Connections'],
      notes: 'Primary suspect in crypto fraud scheme. Has established network across West Africa.',
      created_at: '2025-01-10T14:30:00Z',
      updated_at: '2025-01-15T10:20:00Z',
    },
    {
      id: 'party-002',
      case_id: caseId,
      party_type: 'SUSPECT',
      full_name: 'Emmanuel Nwosu',
      alias: 'CashFlow',
      dob: '1988-03-22',
      nationality: 'Nigerian',
      gender: 'M',
      national_id: 'B9876543210',
      contact: {
        phone: '+234-805-123-4567',
        email: 'e.nwosu@mail.ng',
        address: '12 Victoria Island Extension, Lagos State',
      },
      safeguarding_flags: ['Money Laundering Links'],
      notes: 'Secondary suspect. Handles financial transactions and cryptocurrency conversions.',
      created_at: '2025-01-11T09:15:00Z',
      updated_at: '2025-01-11T09:15:00Z',
    },
    {
      id: 'party-003',
      case_id: caseId,
      party_type: 'VICTIM',
      full_name: 'Sarah Mitchell',
      dob: '1985-11-03',
      nationality: 'British',
      gender: 'F',
      national_id: 'UK987654321',
      contact: {
        phone: '+44-20-7946-0958',
        email: 's.mitchell@email.co.uk',
        address: '78 High Street, London, United Kingdom',
      },
      notes: 'Lost £45,000 in romance scam. Provided extensive chat logs and bank statements.',
      created_at: '2025-01-12T16:45:00Z',
      updated_at: '2025-01-14T11:30:00Z',
    },
    {
      id: 'party-004',
      case_id: caseId,
      party_type: 'VICTIM',
      full_name: 'Aisha Bello',
      dob: '2009-05-20',
      nationality: 'Nigerian',
      gender: 'F',
      national_id: 'C5555444433',
      contact: {
        phone: '+234-806-777-8888',
        email: 'aisha.bello@student.edu.ng',
        address: '23 Ahmadu Bello Way, Kaduna State',
      },
      guardian_contact: {
        name: 'Fatima Bello',
        phone: '+234-806-999-0000',
        email: 'f.bello@gmail.com',
        relationship: 'Mother',
      },
      safeguarding_flags: ['Minor', 'Vulnerable', 'Sextortion Case'],
      notes: 'Minor victim of sextortion. Requires safeguarding measures. Guardian consent obtained.',
      created_at: '2025-01-13T08:20:00Z',
      updated_at: '2025-01-13T08:20:00Z',
    },
    {
      id: 'party-005',
      case_id: caseId,
      party_type: 'WITNESS',
      full_name: 'John Adebayo',
      dob: '1978-07-14',
      nationality: 'Nigerian',
      gender: 'M',
      national_id: 'D1122334455',
      contact: {
        phone: '+234-807-222-3333',
        email: 'j.adebayo@bank.ng',
        address: '5 Marina Road, Lagos Island, Lagos State',
      },
      notes: 'Bank compliance officer. Identified suspicious transaction patterns.',
      created_at: '2025-01-14T13:10:00Z',
      updated_at: '2025-01-14T13:10:00Z',
    },
    {
      id: 'party-006',
      case_id: caseId,
      party_type: 'COMPLAINANT',
      full_name: 'David Chen',
      dob: '1990-02-28',
      nationality: 'American',
      gender: 'M',
      national_id: 'US123456789',
      contact: {
        phone: '+1-555-123-4567',
        email: 'd.chen@techcorp.com',
        address: '456 Tech Valley Blvd, San Francisco, CA, USA',
      },
      notes: 'Filed initial complaint as corporate representative. Business lost $120,000 in BEC scam.',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-10T10:00:00Z',
    },
  ]
}

const createParty = async (input: CreatePartyInput): Promise<Party> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.post(`/api/cases/${input.case_id}/parties`, input)
  // return response.data
  throw new Error('API not implemented')
}

const updateParty = async (partyId: string, input: UpdatePartyInput): Promise<Party> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.put(`/api/parties/${partyId}`, input)
  // return response.data
  throw new Error('API not implemented')
}

const deleteParty = async (partyId: string): Promise<void> => {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/api/parties/${partyId}`)
  throw new Error('API not implemented')
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
