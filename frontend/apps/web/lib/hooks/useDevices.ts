import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../services/api-client"

// Backend-enum aligned types (keep in sync with backend models)
export type CustodyStatus = "IN_VAULT" | "RELEASED" | "RETURNED" | "DISPOSED"
export type DeviceType =
  | "LAPTOP"
  | "DESKTOP"
  | "MOBILE_PHONE"
  | "TABLET"
  | "EXTERNAL_STORAGE"
  | "USB_DRIVE"
  | "MEMORY_CARD"
  | "SERVER"
  | "NETWORK_DEVICE"
  | "OTHER"
export type ImagingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VERIFIED"
export type DeviceCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED"
export type EncryptionStatus = "NONE" | "ENCRYPTED" | "BITLOCKER" | "FILEVAULT" | "PARTIAL" | "UNKNOWN"
export type AnalysisStatus = "PENDING" | "IN_PROGRESS" | "ANALYZED" | "BLOCKED"

export interface Device {
  id: string
  case_id?: string
  seizure_id: string
  label: string
  device_type?: DeviceType
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus
  status?: AnalysisStatus
  forensic_notes?: string
  current_location?: string
  notes?: string
  // Imaging fields
  imaged: boolean
  imaging_status: ImagingStatus
  imaging_started_at?: string
  imaging_completed_at?: string
  imaging_tool?: string
  image_hash?: string
  image_size_bytes?: number
  imaging_technician_id?: string
  // Custody
  custody_status?: CustodyStatus
  created_at: string
  updated_at: string
}

export interface CreateDeviceInput {
  seizure_id: string
  label: string
  device_type?: DeviceType
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus
  status?: AnalysisStatus
  forensic_notes?: string
  current_location?: string
  notes?: string
}

export interface UpdateDeviceInput {
  label?: string
  device_type?: DeviceType
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  storage_capacity?: string
  operating_system?: string
  condition?: DeviceCondition
  description?: string
  powered_on?: boolean
  password_protected?: boolean
  encryption_status?: EncryptionStatus
  status?: AnalysisStatus
  forensic_notes?: string
  current_location?: string
  notes?: string
}

// API functions wired to backend
const fetchDevices = async (caseId: string): Promise<Device[]> => {
  // 1) List seizures for case
  const seizures = await apiClient.get<any[]>(`/devices/${caseId}/seizures`)
  if (!seizures || seizures.length === 0) return []

  // 2) Fetch devices for each seizure
  const deviceLists = await Promise.all(
    seizures.map((s: any) =>
      apiClient.get<any[]>(`/devices/seizures/${String(s.id)}/devices`).catch(() => [])
    )
  )

  // 3) Flatten and map to Device interface
  return deviceLists.flat().map((d: any) => ({
    id: String(d.id),
    case_id: d.case_id ? String(d.case_id) : caseId,
    seizure_id: String(d.seizure_id || ""),
    label: d.label,
    device_type: d.device_type || undefined,
    make: d.make || "",
    model: d.model || "",
    serial_no: d.serial_no || "",
    imei: d.imei || "",
    storage_capacity: d.storage_capacity || "",
    operating_system: d.operating_system || "",
    condition: d.condition || undefined,
    description: d.description || "",
    powered_on: Boolean(d.powered_on),
    password_protected: Boolean(d.password_protected),
    encryption_status: d.encryption_status || "UNKNOWN",
    status: d.status || "PENDING",
    forensic_notes: d.forensic_notes || "",
    current_location: d.current_location || "",
    notes: d.notes || "",
    imaged: Boolean(d.imaged),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    imaging_technician_id: d.imaging_technician_id ? String(d.imaging_technician_id) : undefined,
    custody_status: d.custody_status || "IN_VAULT",
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}

export const fetchDevicesBySeizure = async (seizureId: string): Promise<Device[]> => {
  const devices = await apiClient.get<any[]>(`/devices/seizures/${seizureId}/devices`)
  return (devices || []).map((d: any) => ({
    id: String(d.id),
    case_id: d.case_id ? String(d.case_id) : "",
    seizure_id: String(d.seizure_id || ""),
    label: d.label,
    device_type: d.device_type || undefined,
    make: d.make || "",
    model: d.model || "",
    serial_no: d.serial_no || "",
    imei: d.imei || "",
    storage_capacity: d.storage_capacity || "",
    operating_system: d.operating_system || "",
    condition: d.condition || undefined,
    description: d.description || "",
    powered_on: Boolean(d.powered_on),
    password_protected: Boolean(d.password_protected),
    encryption_status: d.encryption_status || "UNKNOWN",
    status: d.status || "PENDING",
    forensic_notes: d.forensic_notes || "",
    current_location: d.current_location || "",
    notes: d.notes || "",
    imaged: Boolean(d.imaged),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    imaging_technician_id: d.imaging_technician_id ? String(d.imaging_technician_id) : undefined,
    custody_status: d.custody_status || "IN_VAULT",
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}

export const createDevice = async (
  caseId: string,
  input: CreateDeviceInput
): Promise<Device> => {
  if (!input.seizure_id) {
    throw new Error("seizure_id is required to create a device")
  }
  const payload: any = {
    label: input.label,
    device_type: input.device_type,
    make: input.make,
    model: input.model,
    serial_no: input.serial_no,
    imei: input.imei,
    storage_capacity: input.storage_capacity,
    operating_system: input.operating_system,
    condition: input.condition,
    description: input.description,
    powered_on: input.powered_on,
    password_protected: input.password_protected,
    encryption_status: input.encryption_status,
    status: input.status,
    forensic_notes: input.forensic_notes,
    current_location: input.current_location,
    notes: input.notes,
  }
  const d = await apiClient.post<any>(`/devices/seizures/${input.seizure_id}/devices`, payload)
  return {
    id: String(d.id),
    case_id: String(d.case_id ?? caseId),
    seizure_id: String(d.seizure_id || input.seizure_id),
    label: d.label,
    device_type: d.device_type || undefined,
    make: d.make || "",
    model: d.model || "",
    serial_no: d.serial_no || "",
    imei: d.imei || "",
    storage_capacity: d.storage_capacity || "",
    operating_system: d.operating_system || "",
    condition: d.condition || undefined,
    description: d.description || "",
    powered_on: Boolean(d.powered_on),
    password_protected: Boolean(d.password_protected),
    encryption_status: d.encryption_status || "UNKNOWN",
    status: d.status || "PENDING",
    forensic_notes: d.forensic_notes || "",
    current_location: d.current_location || "",
    notes: d.notes || "",
    imaged: Boolean(d.imaged),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    imaging_technician_id: d.imaging_technician_id ? String(d.imaging_technician_id) : undefined,
    custody_status: d.custody_status || "IN_VAULT",
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

export const updateDevice = async (
  deviceId: string,
  input: UpdateDeviceInput
): Promise<Device> => {
  const payload: any = {
    label: input.label,
    device_type: input.device_type,
    make: input.make,
    model: input.model,
    serial_no: input.serial_no,
    imei: input.imei,
    storage_capacity: input.storage_capacity,
    operating_system: input.operating_system,
    condition: input.condition,
    description: input.description,
    powered_on: input.powered_on,
    password_protected: input.password_protected,
    encryption_status: input.encryption_status,
    status: input.status,
    forensic_notes: input.forensic_notes,
    current_location: input.current_location,
    notes: input.notes,
  }
  const d = await apiClient.put<any>(`/devices/devices/${deviceId}`, payload)
  return {
    id: String(d.id),
    case_id: d.case_id ? String(d.case_id) : "",
    seizure_id: String(d.seizure_id || ""),
    label: d.label,
    device_type: d.device_type || undefined,
    make: d.make || "",
    model: d.model || "",
    serial_no: d.serial_no || "",
    imei: d.imei || "",
    storage_capacity: d.storage_capacity || "",
    operating_system: d.operating_system || "",
    condition: d.condition || undefined,
    description: d.description || "",
    powered_on: Boolean(d.powered_on),
    password_protected: Boolean(d.password_protected),
    encryption_status: d.encryption_status || "UNKNOWN",
    status: d.status || "PENDING",
    forensic_notes: d.forensic_notes || "",
    current_location: d.current_location || "",
    notes: d.notes || "",
    imaged: Boolean(d.imaged),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    imaging_technician_id: d.imaging_technician_id ? String(d.imaging_technician_id) : undefined,
    custody_status: d.custody_status || "IN_VAULT",
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

export const deleteDevice = async (deviceId: string): Promise<void> => {
  await apiClient.delete(`/devices/devices/${deviceId}`)
}

export const linkDeviceToSeizure = async (
  deviceId: string,
  seizureId: string
): Promise<Device> => {
  const d = await apiClient.post<any>(`/devices/devices/${deviceId}/link`, { seizure_id: seizureId })
  return {
    id: String(d.id),
    case_id: d.case_id ? String(d.case_id) : "",
    seizure_id: String(d.seizure_id || ""),
    label: d.label,
    device_type: d.device_type || undefined,
    make: d.make || "",
    model: d.model || "",
    serial_no: d.serial_no || "",
    imei: d.imei || "",
    storage_capacity: d.storage_capacity || "",
    operating_system: d.operating_system || "",
    condition: d.condition || undefined,
    description: d.description || "",
    powered_on: Boolean(d.powered_on),
    password_protected: Boolean(d.password_protected),
    encryption_status: d.encryption_status || "UNKNOWN",
    status: d.status || "PENDING",
    forensic_notes: d.forensic_notes || "",
    current_location: d.current_location || "",
    notes: d.notes || "",
    imaged: Boolean(d.imaged),
    imaging_status: d.imaging_status || "NOT_STARTED",
    imaging_started_at: d.imaging_started_at || undefined,
    imaging_completed_at: d.imaging_completed_at || undefined,
    imaging_tool: d.imaging_tool || "",
    image_hash: d.image_hash || "",
    image_size_bytes: typeof d.image_size_bytes === "number" ? d.image_size_bytes : undefined,
    imaging_technician_id: d.imaging_technician_id ? String(d.imaging_technician_id) : undefined,
    custody_status: d.custody_status || "IN_VAULT",
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

// Hooks
export function useDevices(caseId: string) {
  return useQuery({
    queryKey: ["devices", caseId],
    queryFn: () => fetchDevices(caseId),
    enabled: !!caseId,
  })
}

export function useDevicesBySeizure(seizureId: string) {
  return useQuery({
    queryKey: ["devices", "seizure", seizureId],
    queryFn: () => fetchDevicesBySeizure(seizureId),
    enabled: !!seizureId,
  })
}

export function useDeviceMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: CreateDeviceInput) => createDevice(caseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", caseId] })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: UpdateDeviceInput }) =>
      updateDevice(deviceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", caseId] })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", caseId] })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  const linkMutation = useMutation({
    mutationFn: ({ deviceId, seizureId }: { deviceId: string; seizureId: string }) =>
      linkDeviceToSeizure(deviceId, seizureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", caseId] })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId] })
    },
  })

  return {
    createDevice: async (input: CreateDeviceInput) => {
      return createMutation.mutateAsync(input)
    },
    updateDevice: async (deviceId: string, input: UpdateDeviceInput) => {
      return updateMutation.mutateAsync({ deviceId, input })
    },
    deleteDevice: async (deviceId: string) => {
      return deleteMutation.mutateAsync(deviceId)
    },
    linkDevice: async (deviceId: string, seizureId: string) => {
      return linkMutation.mutateAsync({ deviceId, seizureId })
    },
    loading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      linkMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error || linkMutation.error,
  }
}
