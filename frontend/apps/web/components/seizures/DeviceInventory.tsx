'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@jctc/ui'
import { useDevices, useDeviceMutations } from '../../lib/hooks/useDevices'
import { useSeizures } from '../../lib/hooks/useSeizures'

interface DeviceInventoryProps {
  caseId: string
}

export function DeviceInventory({ caseId }: DeviceInventoryProps) {
  const { data: devices = [], isLoading } = useDevices(caseId)
  const { createDevice, deleteDevice, linkDevice, loading: mutationLoading } = useDeviceMutations(caseId)
  const { data: seizures = [], isLoading: seizuresLoading } = useSeizures(caseId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [custodyFilter, setCustodyFilter] = useState<string>('ALL')
  const [imagedFilter, setImagedFilter] = useState<string>('ALL')
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkTargetDeviceId, setLinkTargetDeviceId] = useState<string>('')
  const [selectedLinkSeizureId, setSelectedLinkSeizureId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    label: '',
    make: '',
    model: '',
    serial_no: '',
    imei: '',
    imaged: false,
    image_hash: '',
    custody_status: 'IN_VAULT' as const,
    notes: '',
    seizure_id: '',
  })

  const handleOpenModal = () => {
    setFormData({
      label: '',
      make: '',
      model: '',
      serial_no: '',
      imei: '',
      imaged: false,
      image_hash: '',
      custody_status: 'IN_VAULT',
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
      await createDevice(formData)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDevices.map((device) => {
            const custodyBadge = getCustodyBadge(device.custody_status)
            return (
              <Card key={device.id} className="hover:shadow-lg transition-all duration-300 border border-neutral-200 hover:border-blue-300">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-slate-900 mb-1">{device.label}</h4>
                        <p className="text-sm text-slate-600">{device.make} {device.model}</p>
                      </div>
                    </div>
                    <Badge className={custodyBadge.color}>
                      {custodyBadge.label}
                    </Badge>
                  </div>

                  {/* Device Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {device.serial_no && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Serial No
                        </div>
                        <p className="text-xs font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded">{device.serial_no}</p>
                      </div>
                    )}
                    {device.imei && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          IMEI
                        </div>
                        <p className="text-xs font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded">{device.imei}</p>
                      </div>
                    )}
                  </div>

                  {/* Imaging Status */}
                  <div className={`p-3 rounded-lg border mb-3 ${
                    device.imaged 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 ${device.imaged ? 'text-green-600' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {device.imaged ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                        <span className={`text-xs font-medium ${device.imaged ? 'text-green-800' : 'text-orange-800'}`}>
                          {device.imaged ? 'Forensic Image Created' : 'Awaiting Imaging'}
                        </span>
                      </div>
                      {device.imaged && (
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {device.imaged && device.image_hash && (
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">SHA-256:</span>
                        <p className="font-mono text-green-700 mt-1 truncate" title={device.image_hash}>
                          {device.image_hash.substring(0, 32)}...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {device.notes && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 mb-3">
                      <p className="text-xs text-slate-700">{device.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-neutral-200">
                    <button
                      className="flex-1 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      className="flex-1 px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => openLinkModal(device.id)}
                      disabled={seizuresLoading || mutationLoading}
                      className="flex-1 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4H8l4-8v4h3l-4 8z" />
                      </svg>
                      Link to Seizure
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      disabled={mutationLoading}
                      className="flex-1 px-3 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h3a2 2 0 012 2v2" />
                      </svg>
                      Delete
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

                {/* Custody Status */}
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

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Physical condition, special handling notes, forensic tool used..."
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
