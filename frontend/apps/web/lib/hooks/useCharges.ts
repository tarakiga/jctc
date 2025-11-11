import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Types
type ChargeStatus = 'FILED' | 'WITHDRAWN' | 'AMENDED'

interface Charge {
  id: string
  case_id: string
  statute: string
  statute_section: string
  description: string
  filed_at: string
  status: ChargeStatus
  amended_from_id?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
  created_by_name: string
}

interface CreateChargeInput {
  case_id: string
  statute: string
  statute_section: string
  description: string
  filed_at: string
  status: ChargeStatus
  notes?: string
}

interface UpdateChargeInput {
  statute?: string
  statute_section?: string
  description?: string
  filed_at?: string
  status?: ChargeStatus
  notes?: string
}

// Common Cybercrimes Act 2015 sections for autocomplete
export const CYBERCRIMES_ACT_SECTIONS = [
  { value: 'Section 6', label: 'Section 6 - Unlawful Access to Computer', description: 'Unauthorized access to a computer system or network' },
  { value: 'Section 7', label: 'Section 7 - Access with Intent to Commit Offence', description: 'Accessing a computer with intent to commit further offence' },
  { value: 'Section 8', label: 'Section 8 - Unlawful Modification', description: 'Unauthorized modification of computer data or programs' },
  { value: 'Section 9', label: 'Section 9 - System Interference', description: 'Hindering or interfering with computer system functioning' },
  { value: 'Section 10', label: 'Section 10 - Interception', description: 'Unlawful interception of electronic communications' },
  { value: 'Section 14', label: 'Section 14 - Cyber Harassment', description: 'Bullying, threatening, or harassing via computer systems' },
  { value: 'Section 15', label: 'Section 15 - Racist and Xenophobic Material', description: 'Distributing racist or xenophobic material online' },
  { value: 'Section 16', label: 'Section 16 - Cyber Stalking', description: 'Following, monitoring or tracking movements online' },
  { value: 'Section 17', label: 'Section 17 - Cybersquatting', description: 'Registering domain names in bad faith' },
  { value: 'Section 18', label: 'Section 18 - Phishing', description: 'Fraudulently obtaining personal information' },
  { value: 'Section 19', label: 'Section 19 - Spamming', description: 'Sending unsolicited bulk electronic messages' },
  { value: 'Section 22', label: 'Section 22 - Identity Theft', description: 'Fraudulent use of another person\'s identity' },
  { value: 'Section 23', label: 'Section 23 - Child Pornography', description: 'Production, distribution or possession of child pornography' },
  { value: 'Section 24', label: 'Section 24 - Cybercrime Facilitation', description: 'Aiding, abetting or facilitating cybercrimes' },
  { value: 'Section 27', label: 'Section 27 - Fraud', description: 'Fraud committed through computer systems' },
  { value: 'Section 29', label: 'Section 29 - Terrorism and Extremism', description: 'Using computer systems to facilitate terrorism' }
]

// API functions (to be implemented with actual API client)
const fetchCharges = async (caseId: string): Promise<Charge[]> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/cases/${caseId}/charges`)
  // return response.data
  
  // Mock data for visual review
  return [
    {
      id: 'charge-001',
      case_id: caseId,
      statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
      statute_section: 'Section 27',
      description: 'Conspiracy to commit fraud through email spoofing and Business Email Compromise scheme. Accused impersonated company executives to authorize fraudulent wire transfers totaling $2.5 million USD.',
      filed_at: '2025-01-18T10:00:00Z',
      status: 'FILED',
      notes: 'Primary charge. Evidence includes email logs, wire transfer records, and forensic analysis of compromised email accounts.',
      created_at: '2025-01-18T09:30:00Z',
      updated_at: '2025-01-18T10:00:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'charge-002',
      case_id: caseId,
      statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
      statute_section: 'Section 6',
      description: 'Unlawful access to computer system. Accused gained unauthorized access to company email servers using stolen credentials and phishing techniques.',
      filed_at: '2025-01-18T10:00:00Z',
      status: 'FILED',
      notes: 'Supporting charge. Email server logs show unauthorized access from IP addresses in Lagos and Abuja.',
      created_at: '2025-01-18T09:30:00Z',
      updated_at: '2025-01-18T10:00:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'charge-003',
      case_id: caseId,
      statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
      statute_section: 'Section 22',
      description: 'Identity theft. Accused fraudulently impersonated company CFO and other executives through spoofed email addresses and forged digital signatures.',
      filed_at: '2025-01-18T10:00:00Z',
      status: 'FILED',
      notes: 'Supporting charge. Victims confirmed they did not authorize communications or transactions.',
      created_at: '2025-01-18T09:30:00Z',
      updated_at: '2025-01-18T10:00:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    },
    {
      id: 'charge-004',
      case_id: caseId,
      statute: 'Money Laundering (Prohibition) Act 2022',
      statute_section: 'Section 15(1)',
      description: 'Money laundering. Accused converted and transferred proceeds of crime through multiple cryptocurrency wallets and bank accounts to conceal origin of funds.',
      filed_at: '2025-01-18T10:00:00Z',
      status: 'FILED',
      notes: 'Related financial crime charge. EFCC provided blockchain analysis showing movement of funds through multiple jurisdictions.',
      created_at: '2025-01-18T09:30:00Z',
      updated_at: '2025-01-18T10:00:00Z',
      created_by: 'user-003',
      created_by_name: 'David Okonkwo'
    }
  ]
}

const createCharge = async (input: CreateChargeInput): Promise<Charge> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.post(`/api/cases/${input.case_id}/charges`, input)
  // return response.data
  throw new Error('API not implemented')
}

const updateCharge = async (chargeId: string, updates: UpdateChargeInput): Promise<Charge> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.patch(`/api/charges/${chargeId}`, updates)
  // return response.data
  throw new Error('API not implemented')
}

const deleteCharge = async (chargeId: string): Promise<void> => {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/api/charges/${chargeId}`)
  throw new Error('API not implemented')
}

// Hooks
export function useCharges(caseId: string) {
  return useQuery({
    queryKey: ['charges', caseId],
    queryFn: () => fetchCharges(caseId),
    enabled: !!caseId,
  })
}

export function useChargeMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateChargeInput, 'case_id'>) =>
      createCharge({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateChargeInput }) =>
      updateCharge(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCharge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createCharge: async (input: Omit<CreateChargeInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateCharge: async (id: string, updates: UpdateChargeInput) => {
      return updateMutation.mutateAsync({ id, updates })
    },
    deleteCharge: async (id: string) => {
      return deleteMutation.mutateAsync(id)
    },
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  }
}
