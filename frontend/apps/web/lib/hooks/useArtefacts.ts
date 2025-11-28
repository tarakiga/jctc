import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Types
type ArtefactType = 'CHAT_LOG' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'BROWSER_HISTORY' | 'OTHER'
type SourceTool = 'XRY' | 'XAMN' | 'FTK' | 'AUTOPSY' | 'ENCASE' | 'CELLEBRITE' | 'OTHER'

interface Artefact {
  id: string
  case_id: string
  device_id?: string
  device_label?: string
  artefact_type: ArtefactType
  source_tool: SourceTool
  description: string
  file_name?: string
  file_size?: number
  file_hash: string
  tags: string[]
  extracted_at: string
  created_at: string
  updated_at: string
}

interface CreateArtefactInput {
  case_id: string
  device_id?: string
  artefact_type: ArtefactType
  source_tool: SourceTool
  description: string
  file?: File
  tags: string[]
  extracted_at: string
}

interface UpdateArtefactInput {
  artefact_type?: ArtefactType
  source_tool?: SourceTool
  description?: string
  tags?: string[]
  extracted_at?: string
}

// Helper function to compute SHA-256 hash
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// API functions (to be implemented with actual API client)
const fetchArtefacts = async (caseId: string): Promise<Artefact[]> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/cases/${caseId}/artefacts`)
  // return response.data
  
  // Mock data for visual review
  return [
    {
      id: 'artefact-001',
      case_id: caseId,
      device_id: 'device-001',
      device_label: 'Suspect Laptop - Primary Device',
      artefact_type: 'CHAT_LOG',
      source_tool: 'FTK',
      description: 'WhatsApp chat logs showing communication with victim regarding payment demands. Contains threats and financial transaction discussions.',
      file_name: 'whatsapp_chat_export_2025-01-15.txt',
      file_size: 145678,
      file_hash: 'a7f3d9b2c8e5f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5',
      tags: ['WhatsApp', 'Threat', 'Financial', 'Sextortion'],
      extracted_at: '2025-01-17T11:30:00Z',
      created_at: '2025-01-17T11:35:00Z',
      updated_at: '2025-01-17T11:35:00Z',
    },
    {
      id: 'artefact-002',
      case_id: caseId,
      device_id: 'device-001',
      device_label: 'Suspect Laptop - Primary Device',
      artefact_type: 'IMAGE',
      source_tool: 'AUTOPSY',
      description: 'Compromising images allegedly used for blackmail. Recovered from deleted files in Pictures folder. Metadata indicates capture date matches victim report.',
      file_name: 'recovered_images_folder.zip',
      file_size: 8945672,
      file_hash: 'b3e7f1a8d4c9e2f5a1d7b3c6e9f2a5d8b1c4e7f3a6d9b2c5e8f1a4d7b9c3e6f2',
      tags: ['Evidence', 'Deleted Files', 'Blackmail', 'Images'],
      extracted_at: '2025-01-17T14:20:00Z',
      created_at: '2025-01-17T14:25:00Z',
      updated_at: '2025-01-17T14:25:00Z',
    },
    {
      id: 'artefact-003',
      case_id: caseId,
      device_id: 'device-002',
      device_label: 'Suspect iPhone',
      artefact_type: 'CHAT_LOG',
      source_tool: 'CELLEBRITE',
      description: 'Telegram encrypted chat logs. Contains communications with known cybercrime associates discussing cryptocurrency laundering methods.',
      file_name: 'telegram_chats_extraction.db',
      file_size: 567890,
      file_hash: 'c9f2a5d8b1e4f7a3d6b9c2e5f8a1d4b7c3e6f9a2d5b8c1e4f7a6d9b3c5e2f1a8',
      tags: ['Telegram', 'Cryptocurrency', 'Money Laundering', 'Associates'],
      extracted_at: '2025-01-17T16:45:00Z',
      created_at: '2025-01-17T16:50:00Z',
      updated_at: '2025-01-17T16:50:00Z',
    },
    {
      id: 'artefact-004',
      case_id: caseId,
      device_id: 'device-001',
      device_label: 'Suspect Laptop - Primary Device',
      artefact_type: 'BROWSER_HISTORY',
      source_tool: 'FTK',
      description: 'Chrome browser history showing visits to cryptocurrency exchanges (Binance, Coinbase) and dark web marketplaces. Includes saved login credentials.',
      file_name: 'chrome_history_analysis.html',
      file_size: 234567,
      file_hash: 'd2e8f4a1b7c3e9f5a2d6b1c8e4f7a9d3b5c2e6f1a8d4b7c9e3f5a2d1b6c8e4f7',
      tags: ['Browser History', 'Crypto Exchange', 'Dark Web', 'Chrome'],
      extracted_at: '2025-01-18T09:15:00Z',
      created_at: '2025-01-18T09:20:00Z',
      updated_at: '2025-01-18T09:20:00Z',
    },
    {
      id: 'artefact-005',
      case_id: caseId,
      device_id: 'device-004',
      device_label: 'Internet Cafe Desktop',
      artefact_type: 'DOCUMENT',
      source_tool: 'FTK',
      description: 'Excel spreadsheet containing list of victim names, amounts extorted, and payment wallet addresses. Smoking gun evidence of organized operation.',
      file_name: 'victims_ledger.xlsx',
      file_size: 78901,
      file_hash: 'e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9',
      tags: ['Victims List', 'Financial Records', 'Organized Crime', 'Spreadsheet'],
      extracted_at: '2025-01-18T13:30:00Z',
      created_at: '2025-01-18T13:35:00Z',
      updated_at: '2025-01-18T13:35:00Z',
    },
    {
      id: 'artefact-006',
      case_id: caseId,
      device_id: 'device-002',
      device_label: 'Suspect iPhone',
      artefact_type: 'VIDEO',
      source_tool: 'CELLEBRITE',
      description: 'Screen recording showing suspect accessing victim social media accounts and downloading private content. Timestamp matches victim complaint.',
      file_name: 'screen_recording_20250115.mp4',
      file_size: 15678901,
      file_hash: 'f3a6d9b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5',
      tags: ['Screen Recording', 'Social Media', 'Account Access', 'Video Evidence'],
      extracted_at: '2025-01-18T15:50:00Z',
      created_at: '2025-01-18T15:55:00Z',
      updated_at: '2025-01-18T15:55:00Z',
    },
    {
      id: 'artefact-007',
      case_id: caseId,
      device_id: 'device-003',
      device_label: 'Bank Records USB Drive',
      artefact_type: 'DOCUMENT',
      source_tool: 'AUTOPSY',
      description: 'Bank transaction logs showing suspicious wire transfers to offshore accounts. Total amount: $120,000 over 3-month period.',
      file_name: 'bank_transactions_q4_2024.pdf',
      file_size: 456789,
      file_hash: 'a1d4b7c9e6f3a2d5b8c1e4f7a9d3b6c2e5f8a1d4b7c9e6f3a2d5b1c8e4f7a9d3',
      tags: ['Bank Records', 'Wire Transfer', 'Offshore', 'Financial Crime'],
      extracted_at: '2025-01-19T10:20:00Z',
      created_at: '2025-01-19T10:25:00Z',
      updated_at: '2025-01-19T10:25:00Z',
    },
  ]
}

const fetchArtefactsByDevice = async (deviceId: string): Promise<Artefact[]> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/devices/${deviceId}/artefacts`)
  // return response.data
  
  const allArtefacts = await fetchArtefacts('dummy-case-id')
  return allArtefacts.filter(artefact => artefact.device_id === deviceId)
}

const createArtefact = async (input: CreateArtefactInput): Promise<Artefact> => {
  // TODO: Replace with actual API call
  // Process file upload and compute hash
  let file_hash = ''
  let file_name = ''
  let file_size = 0
  
  if (input.file) {
    file_hash = await computeFileHash(input.file)
    file_name = input.file.name
    file_size = input.file.size
  }
  
  // const response = await apiClient.post(`/api/cases/${input.case_id}/artefacts`, {
  //   ...input,
  //   file_hash,
  //   file_name,
  //   file_size
  // })
  // return response.data
  
  throw new Error('API not implemented')
}

const updateArtefact = async (artefactId: string, input: UpdateArtefactInput): Promise<Artefact> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.put(`/api/artefacts/${artefactId}`, input)
  // return response.data
  throw new Error('API not implemented')
}

const deleteArtefact = async (artefactId: string): Promise<void> => {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/api/artefacts/${artefactId}`)
  throw new Error('API not implemented')
}

const linkArtefactToDevice = async (artefactId: string, deviceId: string): Promise<Artefact> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.put(`/api/artefacts/${artefactId}/link`, { device_id: deviceId })
  // return response.data
  throw new Error('API not implemented')
}

// Hooks
export function useArtefacts(caseId: string) {
  return useQuery({
    queryKey: ['artefacts', caseId],
    queryFn: () => fetchArtefacts(caseId),
    enabled: !!caseId,
  })
}

export function useArtefactsByDevice(deviceId: string) {
  return useQuery({
    queryKey: ['artefacts', 'device', deviceId],
    queryFn: () => fetchArtefactsByDevice(deviceId),
    enabled: !!deviceId,
  })
}

export function useArtefactMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateArtefactInput, 'case_id'>) =>
      createArtefact({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ artefactId, input }: { artefactId: string; input: UpdateArtefactInput }) =>
      updateArtefact(artefactId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteArtefact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const linkMutation = useMutation({
    mutationFn: ({ artefactId, deviceId }: { artefactId: string; deviceId: string }) =>
      linkArtefactToDevice(artefactId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts'] })
    },
  })

  return {
    createArtefact: async (input: Omit<CreateArtefactInput, 'case_id'>) => {
      return createMutation.mutateAsync(input)
    },
    updateArtefact: async (artefactId: string, input: UpdateArtefactInput) => {
      return updateMutation.mutateAsync({ artefactId, input })
    },
    deleteArtefact: async (artefactId: string) => {
      return deleteMutation.mutateAsync(artefactId)
    },
    linkArtefact: async (artefactId: string, deviceId: string) => {
      return linkMutation.mutateAsync({ artefactId, deviceId })
    },
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || linkMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error || linkMutation.error,
  }
}
