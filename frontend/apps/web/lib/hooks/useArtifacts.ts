import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../services/api-client"

export type ArtefactType =
  | "CHAT_LOG"
  | "IMAGE"
  | "VIDEO"
  | "DOC"
  | "BROWSER_HISTORY"
  | "EMAIL"
  | "CALL_LOG"
  | "SMS"
  | "OTHER"

export interface ArtifactInput {
  artefact_type: ArtefactType
  source_tool: string
  description: string
  file_path?: string
  sha256?: string
}

export interface Artifact extends ArtifactInput {
  id: string
  device_id: string
  created_at: string
  updated_at: string
}

// API
export const listArtifacts = async (deviceId: string): Promise<Artifact[]> => {
  const list = await apiClient.get<any[]>(`/devices/devices/${deviceId}/artifacts`)
  return (list || []).map((a) => ({
    id: String(a.id),
    device_id: String(a.device_id),
    artefact_type: a.artefact_type,
    source_tool: a.source_tool,
    description: a.description,
    file_path: a.file_path || undefined,
    sha256: a.sha256 || undefined,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }))
}

export const createArtifact = async (deviceId: string, input: ArtifactInput): Promise<Artifact> => {
  const payload: any = {
    artefact_type: input.artefact_type,
    source_tool: input.source_tool,
    description: input.description,
    file_path: input.file_path,
    sha256: input.sha256,
  }
  const a = await apiClient.post<any>(`/devices/devices/${deviceId}/artifacts`, payload)
  return {
    id: String(a.id),
    device_id: String(a.device_id),
    artefact_type: a.artefact_type,
    source_tool: a.source_tool,
    description: a.description,
    file_path: a.file_path || undefined,
    sha256: a.sha256 || undefined,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }
}

// Hooks
export function useArtifacts(deviceId: string) {
  return useQuery({
    queryKey: ["artifacts", deviceId],
    queryFn: () => listArtifacts(deviceId),
    enabled: !!deviceId,
  })
}

export function useArtifactMutations(caseId?: string) {
  const queryClient = useQueryClient()

  const createM = useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: ArtifactInput }) =>
      createArtifact(deviceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.deviceId] })
      if (caseId) queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  return {
    createArtifact: async (deviceId: string, input: ArtifactInput) => createM.mutateAsync({ deviceId, input }),
    loading: createM.isPending,
    error: createM.error,
  }
}
