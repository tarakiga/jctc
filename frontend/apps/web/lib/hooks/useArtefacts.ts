import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types - relaxed for dynamic lookups
export type ArtefactType = 'CHAT_LOG' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'BROWSER_HISTORY' | 'OTHER' | string
export type SourceTool = 'XRY' | 'XAMN' | 'FTK' | 'AUTOPSY' | 'ENCASE' | 'CELLEBRITE' | 'OTHER' | string

export interface Artefact {
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

const fetchArtefacts = async (caseId: string): Promise<Artefact[]> => {
  return apiClient.get<Artefact[]>(`/cases/${caseId}/artefacts/`)
}

const fetchArtefactsByDevice = async (deviceId: string): Promise<Artefact[]> => {
  return apiClient.get<Artefact[]>(`/devices/${deviceId}/artefacts/`)
}

const createArtefact = async (input: CreateArtefactInput): Promise<Artefact> => {
  return apiClient.post<Artefact>('/artefacts/', input)
}

const updateArtefact = async (artefactId: string, updates: UpdateArtefactInput): Promise<Artefact> => {
  return apiClient.patch<Artefact>(`/artefacts/${artefactId}/`, updates)
}

const deleteArtefact = async (artefactId: string): Promise<void> => {
  return apiClient.delete(`/artefacts/${artefactId}/`)
}

const linkArtefactToDevice = async (artefactId: string, deviceId: string): Promise<Artefact> => {
  return apiClient.post<Artefact>(`/artefacts/${artefactId}/link-device/`, { deviceId })
}

// React Query hooks
export const useArtefacts = (caseId: string) => {
  return useQuery({
    queryKey: ['artefacts', caseId],
    queryFn: () => fetchArtefacts(caseId),
    enabled: !!caseId,
  })
}

export const useArtefactsByDevice = (deviceId: string) => {
  return useQuery({
    queryKey: ['artefacts', 'device', deviceId],
    queryFn: () => fetchArtefactsByDevice(deviceId),
    enabled: !!deviceId,
  })
}

export const useArtefactMutations = (caseId: string) => {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createArtefact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ artefactId, updates }: { artefactId: string; updates: UpdateArtefactInput }) =>
      updateArtefact(artefactId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteArtefact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
    },
  })

  const linkToDeviceMutation = useMutation({
    mutationFn: ({ artefactId, deviceId }: { artefactId: string; deviceId: string }) =>
      linkArtefactToDevice(artefactId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artefacts', caseId] })
    },
  })

  return {
    createArtefact: createMutation.mutateAsync,
    updateArtefact: (artefactId: string, updates: UpdateArtefactInput) => updateMutation.mutateAsync({ artefactId, updates }),
    deleteArtefact: deleteMutation.mutateAsync,
    linkArtefactToDevice: (artefactId: string, deviceId: string) => linkToDeviceMutation.mutateAsync({ artefactId, deviceId }),
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || linkToDeviceMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isLinking: linkToDeviceMutation.isPending,
  }
}
