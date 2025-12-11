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

export interface Artifact {
  id: string
  evidence_id: string
  artefact_type: ArtefactType
  source_tool: string
  description: string
  file_path?: string
  sha256?: string
  created_at: string
  updated_at: string
}

// API
export const listArtifacts = async (evidenceId: string): Promise<Artifact[]> => {
  const list = await apiClient.get<any[]>(`/evidence/${evidenceId}/artefacts`)
  return (list || []).map((a) => ({
    id: String(a.id),
    evidence_id: String(a.evidence_id),
    artefact_type: a.artefact_type,
    source_tool: a.source_tool,
    description: a.description,
    file_path: a.file_path || undefined,
    sha256: a.sha256 || undefined,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }))
}

export const createArtifact = async (evidenceId: string, input: ArtifactInput): Promise<Artifact> => {
  const payload: any = {
    artefact_type: input.artefact_type,
    source_tool: input.source_tool,
    description: input.description,
    file_path: input.file_path,
    sha256: input.sha256,
  }
  const a = await apiClient.post<any>(`/evidence/${evidenceId}/artefacts`, payload)
  return {
    id: String(a.id),
    evidence_id: String(a.evidence_id),
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
export function useArtifacts(evidenceId: string) {
  return useQuery({
    queryKey: ["artifacts", evidenceId],
    queryFn: () => listArtifacts(evidenceId),
    enabled: !!evidenceId,
  })
}

export function useArtifactMutations(caseId?: string) {
  const queryClient = useQueryClient()

  const createM = useMutation({
    mutationFn: ({ evidenceId, input }: { evidenceId: string; input: ArtifactInput }) =>
      createArtifact(evidenceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.evidenceId] })
      if (caseId) queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  return {
    createArtifact: async (evidenceId: string, input: ArtifactInput) => createM.mutateAsync({ evidenceId, input }),
    loading: createM.isPending,
    error: createM.error,
  }
}
