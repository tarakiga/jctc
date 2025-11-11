import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  // TODO: Replace with actual API call
  
  // Mock data
  return [
    {
      id: 'intl-001',
      case_id: caseId,
      request_type: 'MLAT',
      status: 'PENDING',
      requesting_state: 'Nigeria',
      requested_state: 'United States',
      legal_basis: 'MLAT',
      scope: 'Request for subscriber information and transaction records from Coinbase for cryptocurrency wallet addresses: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa, 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy. Requesting: (1) Account holder KYC documents, (2) Transaction history Sep 2024 - Dec 2024, (3) IP address logs, (4) Associated bank account information.',
      poc_name: 'Sarah Williams',
      poc_email: 'sarah.williams@usdoj.gov',
      poc_phone: '+1-202-514-1000',
      submitted_at: '2025-01-14T08:00:00Z',
      response_due_at: '2025-07-14T23:59:59Z',
      notes: 'MLAT request submitted through diplomatic channels. Typical processing time: 3-6 months. US DOJ Office of International Affairs assigned reference number: OIA-2025-12345.',
      created_at: '2025-01-13T16:00:00Z',
      updated_at: '2025-01-14T08:00:00Z',
      created_by: 'user-001',
      created_by_name: 'Admin User'
    },
    {
      id: 'intl-002',
      case_id: caseId,
      request_type: 'PROVIDER_REQUEST',
      status: 'COMPLIED',
      provider: 'Meta',
      provider_request_type: 'DISCLOSURE',
      target_identifier: '+234-803-XXX-XXXX',
      submitted_at: '2025-01-09T10:00:00Z',
      response_due_at: '2025-01-16T23:59:59Z',
      responded_at: '2025-01-15T14:30:00Z',
      response_time_days: 6,
      notes: 'Request for WhatsApp subscriber information and message metadata (no content due to E2E encryption). Meta legal responded with: Account registration date, phone verification timestamp, profile photo, last seen timestamp, and connection logs. Message content not accessible due to encryption.',
      created_at: '2025-01-08T15:00:00Z',
      updated_at: '2025-01-15T14:30:00Z',
      created_by: 'user-004',
      created_by_name: 'Chukwuma Eze'
    },
    {
      id: 'intl-003',
      case_id: caseId,
      request_type: 'PROVIDER_REQUEST',
      status: 'COMPLIED',
      provider: 'Google',
      provider_request_type: 'PRESERVATION',
      target_identifier: 'suspect@example.com',
      submitted_at: '2025-01-07T09:00:00Z',
      response_due_at: '2025-04-07T23:59:59Z',
      responded_at: '2025-01-07T16:00:00Z',
      response_time_days: 0,
      notes: 'Emergency preservation request for Gmail account data. Google acknowledged within 7 hours. Data preserved for 90 days pending production order. Preserved data includes: emails, attachments, Drive files, search history, location data.',
      created_at: '2025-01-07T08:00:00Z',
      updated_at: '2025-01-07T16:00:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'intl-004',
      case_id: caseId,
      request_type: 'PROVIDER_REQUEST',
      status: 'ACKNOWLEDGED',
      provider: 'TikTok',
      provider_request_type: 'DISCLOSURE',
      target_identifier: '@suspectusername',
      submitted_at: '2025-01-10T11:00:00Z',
      response_due_at: '2025-01-24T23:59:59Z',
      notes: 'Request for TikTok account information, posted videos, and user activity logs. TikTok legal team acknowledged request. Processing typically takes 10-14 days. Requested: Account creation date, profile info, video upload history, IP logs, device info.',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-10T13:30:00Z',
      created_by: 'user-004',
      created_by_name: 'Chukwuma Eze'
    },
    {
      id: 'intl-005',
      case_id: caseId,
      request_type: 'MLAT',
      status: 'PENDING',
      requesting_state: 'Nigeria',
      requested_state: 'United Kingdom',
      legal_basis: 'BUDAPEST_24X7',
      scope: 'Emergency request via Budapest Convention 24/7 network for preservation of cloud storage data hosted on UK servers. Suspect uploaded incriminating documents to cloud storage provider. Requesting immediate preservation pending formal MLAT request.',
      poc_name: 'Detective Inspector James Morrison',
      poc_email: 'james.morrison@met.police.uk',
      poc_phone: '+44-20-7230-1212',
      submitted_at: '2025-01-16T14:00:00Z',
      response_due_at: '2025-01-23T23:59:59Z',
      notes: 'Expedited request via Budapest Convention 24/7 emergency channel. UK National Crime Agency point of contact confirmed receipt. 48-hour response expected for preservation order.',
      created_at: '2025-01-16T13:00:00Z',
      updated_at: '2025-01-16T14:00:00Z',
      created_by: 'user-001',
      created_by_name: 'Admin User'
    }
  ]
}

const createRequest = async (input: CreateRequestInput): Promise<InternationalRequest> => {
  // TODO: Replace with actual API call
  throw new Error('API not implemented')
}

const updateRequest = async (requestId: string, updates: Partial<CreateRequestInput>): Promise<InternationalRequest> => {
  // TODO: Replace with actual API call
  throw new Error('API not implemented')
}

const deleteRequest = async (requestId: string): Promise<void> => {
  // TODO: Replace with actual API call
  throw new Error('API not implemented')
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
