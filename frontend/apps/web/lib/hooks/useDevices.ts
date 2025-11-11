import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
type CustodyStatus = 'IN_VAULT' | 'RELEASED' | 'RETURNED' | 'DISPOSED'

interface Device {
  id: string
  case_id: string
  seizure_id?: string
  label: string
  make: string
  model: string
  serial_no?: string
  imei?: string
  imaged: boolean
  image_hash?: string
  custody_status: CustodyStatus
  notes?: string
  created_at: string
  updated_at: string
}

interface CreateDeviceInput {
  case_id: string
  seizure_id?: string
  label: string
  make: string
  model: string
  serial_no?: string
  imei?: string
  imaged: boolean
  image_hash?: string
  custody_status: CustodyStatus
  notes?: string
}

interface UpdateDeviceInput {
  label?: string
  make?: string
  model?: string
  serial_no?: string
  imei?: string
  imaged?: boolean
  image_hash?: string
  custody_status?: CustodyStatus
  notes?: string
}

// API functions wired to backend
const fetchDevices = async (caseId: string): Promise<Device[]> => {
  // List seizures for case
  const seizures = await apiClient.get<any[]>(`/devices/${caseId}/seizures`)
  if (!seizures || seizures.length === 0) return []

  // Fetch devices for each seizure
  const deviceLists = await Promise.all(
    seizures.map((s: any) => apiClient.get<any[]>(`/devices/seizures/${String(s.id)}/devices`).catch(() => []))
  )

  // Flatten and map to Device interface
  return deviceLists.flat().map((d: any) => ({
    id: String(d.id),
    case_id: caseId,
    seizure_id: String(d.seizure_id || ''),
    label: d.label,
    make: d.make || '',
    model: d.model || '',
    serial_no: d.serial_no || '',
    imei: d.imei || '',
    imaged: Boolean(d.imaged),
    image_hash: d.image_hash || '',
    custody_status: 'IN_VAULT',
    notes: d.notes || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}

const fetchDevicesBySeizure = async (seizureId: string): Promise<Device[]> => {
  const devices = await apiClient.get<any[]>(`/devices/seizures/${seizureId}/devices`)
  return (devices || []).map((d: any) => ({
    id: String(d.id),
    case_id: '',
    seizure_id: String(d.seizure_id || ''),
    label: d.label,
    make: d.make || '',
    model: d.model || '',
    serial_no: d.serial_no || '',
    imei: d.imei || '',
    imaged: Boolean(d.imaged),
    image_hash: d.image_hash || '',
    custody_status: 'IN_VAULT',
    notes: d.notes || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}

const createDevice = async (input: CreateDeviceInput): Promise<Device> => {
  if (!input.seizure_id) {
    throw new Error('seizure_id is required to create a device')
  }
  const payload: any = {
    label: input.label,
    make: input.make,
    model: input.model,
    serial_no: input.serial_no,
    imei: input.imei,
    notes: input.notes,
  }
  const d = await apiClient.post<any>(`/devices/seizures/${input.seizure_id}/devices`, payload)
  return {
    id: String(d.id),
    case_id: input.case_id,
    seizure_id: String(d.seizure_id || input.seizure_id),
    label: d.label,
    make: d.make || '',
    model: d.model || '',
    serial_no: d.serial_no || '',
    imei: d.imei || '',
    imaged: Boolean(d.imaged),
    image_hash: d.image_hash || '',
    custody_status: 'IN_VAULT',
    notes: d.notes || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

const updateDevice = async (deviceId: string, input: UpdateDeviceInput): Promise<Device> => {
  const payload: any = {
    label: input.label,
    make: input.make,
    model: input.model,
    serial_no: input.serial_no,
    imei: input.imei,
    notes: input.notes,
  }
  const d = await apiClient.put<any>(`/devices/devices/${deviceId}`, payload)
  return {
    id: String(d.id),
    case_id: '',
    seizure_id: String(d.seizure_id || ''),
    label: d.label,
    make: d.make || '',
    model: d.model || '',
    serial_no: d.serial_no || '',
    imei: d.imei || '',
    imaged: Boolean(d.imaged),
    image_hash: d.image_hash || '',
    custody_status: 'IN_VAULT',
    notes: d.notes || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

const deleteDevice = async (deviceId: string): Promise<void> => {
  await apiClient.delete(`/devices/devices/${deviceId}`)
}

const linkDeviceToSeizure = async (deviceId: string, seizureId: string): Promise<Device> => {
  const d = await apiClient.post<any>(`/devices/devices/${deviceId}/link`, { seizure_id: seizureId })
  return {
    id: String(d.id),
    case_id: '',
    seizure_id: String(d.seizure_id || ''),
    label: d.label,
    make: d.make || '',
    model: d.model || '',
    serial_no: d.serial_no || '',
    imei: d.imei || '',
    imaged: Boolean(d.imaged),
    image_hash: d.image_hash || '',
    custody_status: 'IN_VAULT',
    notes: d.notes || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

// Hooks
export function useDevices(caseId: string) {
  return useQuery({
    queryKey: ['devices', caseId],
    queryFn: () => fetchDevices(caseId),
    enabled: !!caseId,
  })
}

export function useDevicesBySeizure(seizureId: string) {
  return useQuery({
    queryKey: ['devices', 'seizure', seizureId],
    queryFn: () => fetchDevicesBySeizure(seizureId),
    enabled: !!seizureId,
  })
}

export function useDeviceMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateDeviceInput, 'case_id'>) =>
      createDevice({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: UpdateDeviceInput }) =>
      updateDevice(deviceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const linkMutation = useMutation({
    mutationFn: ({ deviceId, seizureId }: { deviceId: string; seizureId: string }) =>
      linkDeviceToSeizure(deviceId, seizureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    createDevice: async (input: Omit<CreateDeviceInput, 'case_id'>) => {
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
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || linkMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error || linkMutation.error,
  }
}
