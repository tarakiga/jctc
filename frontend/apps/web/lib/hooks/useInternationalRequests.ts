import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
type RequestType = 'MLAT' | 'PROVIDER_REQUEST'
type LegalBasis = 'MLAT' | 'LETTERS_ROGATORY' | 'BUDAPEST_24X7' | 'OTHER'
type ProviderRequestType = 'PRESERVATION' | 'DISCLOSURE'
type RequestStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLIED' | 'REFUSED' | 'EXPIRED'

interface InternationalRequest {
  id: string
  case_id: string
  request_type: RequestType
  status: RequestStatus
  
  // MLAT specific fields
  requesting_state?: string
  requested_state?: string
  legal_basis?: LegalBasis
  scope?: string
  poc_name?: string
  poc_email?: string
  poc_phone?: string
  
  // Provider request specific fields
  provider?: string
  provider_request_type?: ProviderRequestType
  target_identifier?: string
  
  // Common fields
  submitted_at: string
  response_due_at?: string
  responded_at?: string
  response_time_days?: number
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
  created_by_name: string
}

interface CreateRequestInput {
  case_id: string
  request_type: RequestType
  status: RequestStatus
  
  // MLAT specific
  requesting_state?: string
  requested_state?: string
  legal_basis?: LegalBasis
  scope?: string
  poc_name?: string
  poc_email?: string
  poc_phone?: string
  
  // Provider specific
  provider?: string
  provider_request_type?: ProviderRequestType
  target_identifier?: string
  
  // Common
  submitted_at: string
  response_due_at?: string
  notes?: string
}

// Common providers with contact info
export const COMMON_PROVIDERS = [
  { value: 'Google', label: 'Google / YouTube', email: 'legal@google.com', url: 'https://support.google.com/transparencyreport' },
  { value: 'Meta', label: 'Meta (Facebook, Instagram, WhatsApp)', email: 'legal@fb.com', url: 'https://www.facebook.com/safety/groups/law/guidelines/' },
  { value: 'TikTok', label: 'TikTok / ByteDance', email: 'legal@tiktok.com', url: 'https://www.tiktok.com/legal/law-enforcement' },
  { value: 'Twitter', label: 'Twitter / X', email: 'legal@twitter.com', url: 'https://help.twitter.com/en/rules-and-policies/twitter-law-enforcement-support' },
  { value: 'Microsoft', label: 'Microsoft / LinkedIn', email: 'legal@microsoft.com', url: 'https://www.microsoft.com/en-us/corporate-responsibility/law-enforcement-requests' },
  { value: 'Apple', label: 'Apple', email: 'legal@apple.com', url: 'https://www.apple.com/legal/transparency/'},
  { value: 'Telegram', label: 'Telegram', email: 'legal@telegram.org', url: 'https://telegram.org/faq#q-do-you-process-data-requests' },
  { value: 'Coinbase', label: 'Coinbase', email: 'legal@coinbase.com', url: 'https://www.coinbase.com/legal/law_enforcement' }
]

// API functions
const fetchRequests = async (caseId: string): Promise<InternationalRequest[]> => {
  return await apiClient.get<InternationalRequest[]>(`/cases/${caseId}/international-requests/`)
}

const createRequest = async (input: CreateRequestInput): Promise<InternationalRequest> => {
  return await apiClient.post<InternationalRequest>('/international-requests/', input)
}

const updateRequest = async (requestId: string, updates: Partial<CreateRequestInput>): Promise<InternationalRequest> => {
  return await apiClient.patch<InternationalRequest>(`/international-requests/${requestId}/`, updates)
}

const deleteRequest = async (requestId: string): Promise<void> => {
  await apiClient.delete(`/international-requests/${requestId}/`)
}

// Hooks
export function useInternationalRequests(caseId: string) {
  return useQuery({
    queryKey: ['international-requests', caseId],
    queryFn: () => fetchRequests(caseId),
    enabled: !!caseId,
  })
}

export function useInternationalRequestMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateRequestInput, 'case_id'>) =>
      createRequest({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['international-requests', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateRequestInput> }) =>
      updateRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['international-requests', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['international-requests', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createRequest: async (input: Omit<CreateRequestInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateRequest: async (id: string, updates: Partial<CreateRequestInput>) => {
      return updateMutation.mutateAsync({ id, updates })
    },
    deleteRequest: async (id: string) => {
      return deleteMutation.mutateAsync(id)
    },
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
