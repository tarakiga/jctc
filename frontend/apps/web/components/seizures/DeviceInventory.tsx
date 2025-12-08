'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'
import { useDevices, useDeviceMutations, DeviceType, EncryptionStatus, CustodyStatus, AnalysisStatus } from '../../lib/hooks/useDevices'
import { useSeizures } from '../../lib/hooks/useSeizures'
import { useDeviceImaging, useImagingMutations, ImagingStatus } from '../../lib/hooks/useDeviceImaging'
import { useArtifacts, useArtifactMutations, ArtefactType } from '../../lib/hooks/useArtifacts'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'

interface DeviceInventoryProps {
  caseId: string
}

export function DeviceInventory({ caseId }: DeviceInventoryProps) {
  const { data: devices = [], isLoading } = useDevices(caseId)
  const { createDevice, deleteDevice, linkDevice, loading: mutationLoading } = useDeviceMutations(caseId)

  const { updateImaging, loading: imagingLoading } = useImagingMutations(caseId)
  const { createArtifact, loading: artifactLoading } = useArtifactMutations(caseId)
  const [isImagingModalOpen, setIsImagingModalOpen] = useState(false)
  const [imagingDeviceId, setImagingDeviceId] = useState<string>('')
  const { data: imagingData } = useDeviceImaging(imagingDeviceId)
  const [imagingForm, setImagingForm] = useState<{
    imaging_status: ImagingStatus;
    imaging_tool: string;
    image_hash: string;
    image_size_bytes: number;
    forensic_notes: string;
  }>({
    imaging_status: 'NOT_STARTED',
    imaging_tool: '',
    image_hash: '',
    image_size_bytes: 0,
    forensic_notes: '',
  })
  useEffect(() => {
    if (imagingData) {
      setImagingForm({
        imaging_status: imagingData.imaging_status,
        imaging_tool: imagingData.imaging_tool || '',
        image_hash: imagingData.image_hash || '',
        image_size_bytes: imagingData.image_size_bytes || 0,
        forensic_notes: '',
      })
    }
  }, [imagingData])

  const openImagingModal = (deviceId: string) => { setImagingDeviceId(deviceId); setIsImagingModalOpen(true) }
  const closeImagingModal = () => { setIsImagingModalOpen(false); setImagingDeviceId('') }
  const handleImagingSubmit = async () => {
    if (!imagingDeviceId) { alert('No device selected'); return }
    try {
      await updateImaging(imagingDeviceId, imagingForm)
      closeImagingModal()
    } catch (err) {
      console.error('Error updating imaging:', err)
      alert('Failed to update imaging')
    }
  }

  const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false)
  const [artifactDeviceId, setArtifactDeviceId] = useState<string>('')
  const { data: artifacts = [] } = useArtifacts(artifactDeviceId)
  const [artifactForm, setArtifactForm] = useState({
    artefact_type: 'OTHER' as ArtefactType,
    source_tool: '',
    description: '',
    file_path: '',
    sha256: '',
  })
  const openArtifactModal = (deviceId: string) => { setArtifactDeviceId(deviceId); setIsArtifactModalOpen(true) }
  const closeArtifactModal = () => { setIsArtifactModalOpen(false); setArtifactDeviceId('') }
  const handleArtifactSubmit = async () => {
    if (!artifactDeviceId) { alert('No device selected'); return }
    try {
      await createArtifact(artifactDeviceId, artifactForm)
      setArtifactForm({ artefact_type: 'OTHER' as ArtefactType, source_tool: '', description: '', file_path: '', sha256: '' })
    } catch (err) {
      console.error('Error adding artifact:', err)
      alert('Failed to add artifact')
    }
  }

  // Fetch seizures for device creation
  const { data: seizures = [] } = useSeizures(caseId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [custodyFilter, setCustodyFilter] = useState<string>('ALL')
  const [imagedFilter, setImagedFilter] = useState<string>('ALL')
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkTargetDeviceId, setLinkTargetDeviceId] = useState<string>('')
  const [selectedLinkSeizureId, setSelectedLinkSeizureId] = useState<string>('')

  const [formData, setFormData] = useState<{
    label: string;
    device_type: DeviceType | '';
    make: string;
    model: string;
    serial_no: string;
    imei: string;
    storage_capacity: string;
    operating_system: string;
    condition: string;
    description: string;
    powered_on: boolean;
    password_protected: boolean;
    encryption_status: EncryptionStatus;
    imaged: boolean;
    image_hash: string;
    custody_status: CustodyStatus;
    status: AnalysisStatus;
    forensic_notes: string;
    notes: string;
    seizure_id: string;
  }>({
    label: '',
    device_type: '',
    make: '',
    model: '',
    serial_no: '',
    imei: '',
    storage_capacity: '',
    operating_system: '',
    condition: '',
    description: '',
    powered_on: false,
    password_protected: false,
    encryption_status: 'UNKNOWN',
    imaged: false,
    image_hash: '',
    custody_status: 'IN_VAULT',
    status: 'PENDING',
    forensic_notes: '',
    notes: '',
    seizure_id: '',
  })

  const handleOpenModal = () => {
    setFormData({
      label: '',
      device_type: '',
      make: '',
      model: '',
      serial_no: '',
      imei: '',
      storage_capacity: '',
      operating_system: '',
      condition: '',
      description: '',
      powered_on: false,
      password_protected: false,
      encryption_status: 'UNKNOWN',
      imaged: false,
      image_hash: '',
      custody_status: 'IN_VAULT',
      status: 'PENDING',
      forensic_notes: '',
      notes: '',
      seizure_id: '',
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (!formData.seizure_id) {
        alert('Please select a seizure for this device')
        return
      }
      // Convert formData to CreateDeviceInput format
      await createDevice({
        seizure_id: formData.seizure_id,
        label: formData.label,
        device_type: formData.device_type || undefined,
        make: formData.make || undefined,
        model: formData.model || undefined,
        serial_no: formData.serial_no || undefined,
        imei: formData.imei || undefined,
        storage_capacity: formData.storage_capacity || undefined,
        operating_system: formData.operating_system || undefined,
        description: formData.description || undefined,
        powered_on: formData.powered_on,
        password_protected: formData.password_protected,
        encryption_status: formData.encryption_status,
        status: formData.status,
        forensic_notes: formData.forensic_notes || undefined,
        notes: formData.notes || undefined,
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error creating device:', error)
      alert('Failed to add device to inventory')
    }
  }

  const openLinkModal = (deviceId: string) => {
    setLinkTargetDeviceId(deviceId)
    setSelectedLinkSeizureId('')
    setIsLinkModalOpen(true)
  }

  const closeLinkModal = () => {
    setIsLinkModalOpen(false)
    setLinkTargetDeviceId('')
    setSelectedLinkSeizureId('')
  }

  const handleLinkSubmit = async () => {
    if (!linkTargetDeviceId || !selectedLinkSeizureId) {
      alert('Please select a seizure to link to')
      return
    }
    try {
      await linkDevice(linkTargetDeviceId, selectedLinkSeizureId)
      closeLinkModal()
    } catch (error) {
      console.error('Error linking device:', error)
      alert('Failed to link device to seizure')
    }
  }

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Delete this device and all associated artefacts?')) return
    try {
      await deleteDevice(deviceId)
    } catch (error) {
      console.error('Error deleting device:', error)
      alert('Failed to delete device')
    }
  }

  const getCustodyBadge = (status: string) => {
    const variants = {
      IN_VAULT: { variant: 'success' as const, label: 'In Vault', color: 'bg-green-100 text-green-800 border-green-200' },
      RELEASED: { variant: 'warning' as const, label: 'Released', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      RETURNED: { variant: 'info' as const, label: 'Returned', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      DISPOSED: { variant: 'critical' as const, label: 'Disposed', color: 'bg-red-100 text-red-800 border-red-200' },
    }
    return variants[status as keyof typeof variants] || variants.IN_VAULT
  }

  // Filter devices
  const filteredDevices = devices.filter(device => {
    if (custodyFilter !== 'ALL' && device.custody_status !== custodyFilter) return false
    if (imagedFilter === 'IMAGED' && !device.imaged) return false
    if (imagedFilter === 'NOT_IMAGED' && device.imaged) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-neutral-500">Loading device inventory...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900">Device Inventory</h3>
          <p className="text-sm text-slate-600 mt-1">Seized digital devices and storage media</p>

          {/* Filters */}
          <div className="flex gap-3 mt-4">
            <select
              value={custodyFilter}
              onChange={(e) => setCustodyFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium bg-white shadow-sm hover:shadow transition-all"
            >
              <option value="ALL">All Custody ({devices.length})</option>
              <option value="IN_VAULT">In Vault</option>
              <option value="RELEASED">Released</option>
              <option value="RETURNED">Returned</option>
              <option value="DISPOSED">Disposed</option>
            </select>

            <select
              value={imagedFilter}
              onChange={(e) => setImagedFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium bg-white shadow-sm hover:shadow transition-all"
            >
              <option value="ALL">All Devices</option>
              <option value="IMAGED">Imaged Only</option>
              <option value="NOT_IMAGED">Awaiting Imaging</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2.5 bg-black text-white rounded-lg font-medium shadow-sm hover:shadow-md hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Device
        </button>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-neutral-900 font-medium">No devices in inventory</p>
                <p className="text-sm text-neutral-500 mt-1">Add your first seized device to start tracking</p>
              </div>
              <button
                onClick={handleOpenModal}
                className="mt-2 px-4 py-2 bg-black text-white rounded-lg font-medium shadow-sm hover:shadow hover:bg-neutral-800 transition-all active:scale-95"
              >
                Add First Device
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDevices.map((device) => {
            const custodyBadge = getCustodyBadge(device.custody_status || 'IN_VAULT')

            // Get device type icon
            const getDeviceIcon = (type: string) => {
              const icons: Record<string, string> = {
                'LAPTOP': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                'DESKTOP': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                'MOBILE_PHONE': 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
                'TABLET': 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
                'SERVER': 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
              }
              return icons[type] || icons['MOBILE_PHONE']
            }

            return (
              <Card key={device.id} className="group relative overflow-hidden hover:shadow-xl transition-all duration-500 border-2 border-slate-200 hover:border-indigo-300">
                {/* Gradient Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <CardContent className="p-6">
                  {/* Header Section */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative">
                      <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={getDeviceIcon(device.device_type || 'MOBILE_PHONE')} />
                        </svg>
                      </div>
                      {/* Status Indicator Dot */}
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-md ${device.status === 'ANALYZED' ? 'bg-green-500' :
                          device.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                            device.status === 'BLOCKED' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-lg font-bold text-slate-900 leading-tight truncate">{device.label}</h4>
                        <Badge className={`${custodyBadge.color} shrink-0 text-xs px-2.5 py-1`}>
                          {custodyBadge.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-600">{device.make} {device.model}</p>
                      {device.device_type && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          {device.device_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Specifications Grid */}
                  {(device.storage_capacity || device.operating_system || device.condition) && (
                    <div className="mb-4 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-3">
                        {device.storage_capacity && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-500 leading-none">Storage</p>
                              <p className="text-sm font-semibold text-slate-900">{device.storage_capacity}</p>
                            </div>
                          </div>
                        )}
                        {device.operating_system && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-500 leading-none">OS</p>
                              <p className="text-sm font-semibold text-slate-900 truncate">{device.operating_system}</p>
                            </div>
                          </div>
                        )}
                        {device.condition && (
                          <div className="flex items-center gap-2 col-span-2">
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-500 leading-none">Condition</p>
                              <p className="text-sm font-semibold text-slate-900">{device.condition}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Security & Identifiers */}
                  <div className="space-y-2.5 mb-4">
                    {/* Serial/IMEI Row */}
                    {(device.serial_no || device.imei) && (
                      <div className="flex gap-2">
                        {device.serial_no && (
                          <div className="flex-1 p-2 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-0.5">Serial</p>
                            <p className="text-xs font-mono font-semibold text-slate-900 truncate">{device.serial_no}</p>
                          </div>
                        )}
                        {device.imei && (
                          <div className="flex-1 p-2 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-0.5">IMEI</p>
                            <p className="text-xs font-mono font-semibold text-slate-900 truncate">{device.imei}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Security Status Row */}
                    {(device.encryption_status !== 'UNKNOWN' || device.password_protected || device.powered_on) && (
                      <div className="flex flex-wrap gap-1.5">
                        {device.encryption_status !== 'UNKNOWN' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md">
                            <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-xs font-medium text-purple-700">{device.encryption_status}</span>
                          </div>
                        )}
                        {device.password_protected && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md">
                            <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span className="text-xs font-medium text-amber-700">Locked</span>
                          </div>
                        )}
                        {device.powered_on && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-md">
                            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-xs font-medium text-green-700">Powered On</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Imaging Status - Enhanced */}
                  <div className={`relative overflow-hidden rounded-xl border-2 mb-4 transition-all ${device.imaged
                      ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-300'
                      : 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-amber-300'
                    }`}>
                    <div className="relative p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${device.imaged ? 'bg-emerald-100' : 'bg-amber-100'
                            }`}>
                            <svg className={`w-4 h-4 ${device.imaged ? 'text-emerald-600' : 'text-amber-600'
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              {device.imaged ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${device.imaged ? 'text-emerald-900' : 'text-amber-900'
                              }`}>
                              {device.imaged ? 'Forensic Image Verified' : 'Awaiting Forensic Imaging'}
                            </p>
                            <p className={`text-xs ${device.imaged ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                              {device.imaged ? 'SHA-256 verified' : 'Queued for imaging'}
                            </p>
                          </div>
                        </div>
                        {device.imaged && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-lg">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-bold text-emerald-700">OK</span>
                          </div>
                        )}
                      </div>
                      {device.imaged && device.image_hash && (
                        <div className="mt-2 p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-emerald-200">
                          <p className="text-xs font-mono text-emerald-800 truncate" title={device.image_hash}>
                            {device.image_hash}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Refined */}
                  <div className="flex gap-2">
                    <button className="flex-1 group/btn relative overflow-hidden px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </span>
                    </button>
                    <button className="p-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl transition-all active:scale-95 group/icon">
                      <svg className="w-5 h-5 text-slate-600 group-hover/icon:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      disabled={mutationLoading}
                      className="p-2.5 bg-white hover:bg-red-50 border-2 border-slate-200 hover:border-red-300 rounded-xl transition-all active:scale-95 group/icon disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 text-slate-600 group-hover/icon:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Add Device to Inventory</h2>
                <p className="text-slate-600 mt-1">Register a new seized digital device or storage media</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Seizure Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Seizure <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.seizure_id}
                    onChange={(e) => setFormData({ ...formData, seizure_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select a seizure...</option>
                    {seizures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.seized_at).toLocaleDateString()} — {s.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Device Label */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Device Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="e.g., Suspect Laptop - Primary Device"
                  />
                </div>

                {/* Device Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value as DeviceType | '' })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select device type...</option>
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop Computer</option>
                    <option value="MOBILE_PHONE">Mobile Phone</option>
                    <option value="TABLET">Tablet</option>
                    <option value="EXTERNAL_STORAGE">External Storage</option>
                    <option value="USB_DRIVE">USB Drive</option>
                    <option value="MEMORY_CARD">Memory Card</option>
                    <option value="SERVER">Server</option>
                    <option value="NETWORK_DEVICE">Network Device</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Make & Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., Apple, Samsung, Dell"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., iPhone 13 Pro, XPS 15"
                    />
                  </div>
                </div>

                {/* Storage & OS */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Storage Capacity</label>
                    <input
                      type="text"
                      value={formData.storage_capacity}
                      onChange={(e) => setFormData({ ...formData, storage_capacity: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., 512GB SSD, 256GB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Operating System</label>
                    <input
                      type="text"
                      value={formData.operating_system}
                      onChange={(e) => setFormData({ ...formData, operating_system: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., Windows 11 Pro, iOS 17.2"
                    />
                  </div>
                </div>

                {/* Device Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Device Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Where found, what it contains, general context..."
                  />
                </div>

                {/* Serial No & IMEI */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serial_no}
                      onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono text-sm"
                      placeholder="Device serial number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">IMEI (for phones)</label>
                    <input
                      type="text"
                      value={formData.imei}
                      onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono text-sm"
                      placeholder="15-digit IMEI"
                    />
                  </div>
                </div>

                {/* Physical Condition & Security State */}
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Device State at Seizure
                  </h4>
                  <div className="space-y-4">
                    {/* Condition & Encryption */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Physical Condition</label>
                        <select
                          value={formData.condition}
                          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="">Select condition...</option>
                          <option value="EXCELLENT">Excellent</option>
                          <option value="GOOD">Good</option>
                          <option value="FAIR">Fair</option>
                          <option value="POOR">Poor</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Encryption Status</label>
                        <select
                          value={formData.encryption_status}
                          onChange={(e) => setFormData({ ...formData, encryption_status: e.target.value as any })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                        >
                          <option value="UNKNOWN">Unknown</option>
                          <option value="NONE">None</option>
                          <option value="ENCRYPTED">Encrypted</option>
                          <option value="BITLOCKER">BitLocker</option>
                          <option value="FILEVAULT">FileVault</option>
                          <option value="PARTIAL">Partial</option>
                        </select>
                      </div>
                    </div>
                    {/* Checkboxes */}
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="powered_on"
                          checked={formData.powered_on}
                          onChange={(e) => setFormData({ ...formData, powered_on: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <label htmlFor="powered_on" className="text-sm font-medium text-slate-700">
                          Device was powered on
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="password_protected"
                          checked={formData.password_protected}
                          onChange={(e) => setFormData({ ...formData, password_protected: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <label htmlFor="password_protected" className="text-sm font-medium text-slate-700">
                          Password protected
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custody & Analysis Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Custody Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.custody_status}
                      onChange={(e) => setFormData({ ...formData, custody_status: e.target.value as any })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="IN_VAULT">In Vault</option>
                      <option value="RELEASED">Released</option>
                      <option value="RETURNED">Returned</option>
                      <option value="DISPOSED">Disposed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Analysis Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="ANALYZED">Analyzed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                </div>

                {/* Imaging Status */}
                <div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <input
                      type="checkbox"
                      id="imaged"
                      checked={formData.imaged}
                      onChange={(e) => setFormData({ ...formData, imaged: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="imaged" className="text-sm font-semibold text-slate-700">
                      Forensic image has been created
                    </label>
                  </div>
                  {formData.imaged && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Image Hash (SHA-256)</label>
                      <input
                        type="text"
                        value={formData.image_hash}
                        onChange={(e) => setFormData({ ...formData, image_hash: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono text-sm"
                        placeholder="Enter forensic image hash for verification"
                      />
                    </div>
                  )}
                </div>

                {/* Forensic Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Forensic Analysis Notes</label>
                  <textarea
                    rows={3}
                    value={formData.forensic_notes}
                    onChange={(e) => setFormData({ ...formData, forensic_notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Detailed forensic analysis observations, findings, technical notes..."
                  />
                </div>

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">General Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Physical condition, special handling notes, chain of custody remarks..."
                  />
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl font-medium shadow-sm hover:shadow transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={mutationLoading}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {mutationLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Add Device
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Link Device Modal */}
      {isLinkModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={closeLinkModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg">
              <div className="relative px-6 pt-6 pb-4 border-b border-slate-200/60">
                <button
                  onClick={closeLinkModal}
                  className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h3 className="text-2xl font-bold text-slate-900">Link Device to Seizure</h3>
                <p className="text-slate-600 mt-1">Choose a seizure within this case</p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Seizure</label>
                  <select
                    value={selectedLinkSeizureId}
                    onChange={(e) => setSelectedLinkSeizureId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="">Select a seizure...</option>
                    {seizures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.seized_at).toLocaleDateString()} — {s.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-600">
                  Users with FORENSIC, INVESTIGATOR, or ADMIN roles can link devices within the same case.
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLinkModal}
                  className="px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl font-medium shadow-sm hover:shadow transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkSubmit}
                  disabled={!selectedLinkSeizureId || mutationLoading}
                  className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {mutationLoading ? 'Linking...' : 'Link Device'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

