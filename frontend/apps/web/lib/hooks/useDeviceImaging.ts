import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../services/api-client"

export type ImagingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VERIFIED"

export interface ImagingUpdateInput {
  imaging_status?: ImagingStatus
  imaging_tool?: string
  image_hash?: string
  image_size_bytes?: number
  forensic_notes?: string
}

export interface DeviceImaging {
  device_id: string
  imaging_status: ImagingStatus
  imaging_started_at?: string
  imaging_completed_at?: string
  imaging_tool?: string
  image_hash?: string
  image_size_bytes?: number
  technician_id?: string
  updated_at: string
}

// API
export const getDeviceImaging = async (deviceId: string): Promise<DeviceImaging> => {
  const d = await apiClient.get<any>(`/devices/devices/${deviceId}/imaging`)
  return {
    device_id: String(d.device_id),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    technician_id: d.technician_id ? String(d.technician_id) : undefined,
    updated_at: d.updated_at,
  }
}

export const updateDeviceImaging = async (
  deviceId: string,
  input: ImagingUpdateInput
): Promise<DeviceImaging> => {
  const payload: any = {
    imaging_status: input.imaging_status,
    imaging_tool: input.imaging_tool,
    image_hash: input.image_hash,
    image_size_bytes: input.image_size_bytes,
    forensic_notes: input.forensic_notes,
  }
  const d = await apiClient.put<any>(`/devices/devices/${deviceId}/imaging`, payload)
  return {
    device_id: String(d.device_id),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    technician_id: d.technician_id ? String(d.technician_id) : undefined,
    updated_at: d.updated_at,
  }
}

// Hooks
export function useDeviceImaging(deviceId: string) {
  return useQuery({
    queryKey: ["device-imaging", deviceId],
    queryFn: () => getDeviceImaging(deviceId),
    enabled: !!deviceId,
  })
}

export function useImagingMutations(caseId?: string) {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: ImagingUpdateInput }) =>
      updateDeviceImaging(deviceId, input),
    onSuccess: (_, variables) => {
      // Invalidate device imaging cache and device lists
      queryClient.invalidateQueries({ queryKey: ["device-imaging", variables.deviceId] })
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ["devices", caseId] })
        queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
      }
    },
  })

  return {
    updateImaging: async (deviceId: string, input: ImagingUpdateInput) => {
      return updateMutation.mutateAsync({ deviceId, input })
    },
    loading: updateMutation.isPending,
    error: updateMutation.error,
  }
}
