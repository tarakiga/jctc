'use client'

import { useState, useMemo } from 'react'
import { useLegalInstruments, useLegalInstrumentMutations } from '@/lib/hooks/useLegalInstruments'
import { Scale, Plus, X, Trash2, Edit, FileText, AlertTriangle, Clock, CheckCircle, Filter } from 'lucide-react'
import { format, differenceInDays, isPast, isFuture, addDays } from 'date-fns'

interface LegalInstrumentManagerProps {
  caseId: string
}

type InstrumentType = 'WARRANT' | 'PRESERVATION' | 'MLAT' | 'COURT_ORDER'
type InstrumentStatus = 'REQUESTED' | 'ISSUED' | 'DENIED' | 'EXPIRED' | 'EXECUTED'

const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  WARRANT: 'Warrant',
  PRESERVATION: 'Preservation Order',
  MLAT: 'MLAT Request',
  COURT_ORDER: 'Court Order'
}

const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  REQUESTED: 'Requested',
  ISSUED: 'Issued',
  DENIED: 'Denied',
  EXPIRED: 'Expired',
  EXECUTED: 'Executed'
}

const TYPE_COLORS: Record<InstrumentType, string> = {
  WARRANT: 'from-red-50 to-orange-50',
  PRESERVATION: 'from-blue-50 to-cyan-50',
  MLAT: 'from-purple-50 to-violet-50',
  COURT_ORDER: 'from-green-50 to-emerald-50'
}

const STATUS_COLORS: Record<InstrumentStatus, { bg: string; text: string }> = {
  REQUESTED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  ISSUED: { bg: 'bg-green-100', text: 'text-green-800' },
  DENIED: { bg: 'bg-red-100', text: 'text-red-800' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800' },
  EXECUTED: { bg: 'bg-blue-100', text: 'text-blue-800' }
}

export default function LegalInstrumentManager({ caseId }: LegalInstrumentManagerProps) {
  const { data: instruments = [], isLoading } = useLegalInstruments(caseId)
  const { createInstrument, updateInstrument, deleteInstrument, loading } = useLegalInstrumentMutations(caseId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<InstrumentType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<InstrumentStatus | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    instrument_type: 'WARRANT' as InstrumentType,
    reference_no: '',
    issuing_authority: '',
    issued_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
    status: 'REQUESTED' as InstrumentStatus,
    scope_description: '',
    document: null as File | null,
    notes: ''
  })

  // Filtered and categorized instruments
  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const matchesType = typeFilter === 'ALL' || inst.instrument_type === typeFilter
      const matchesStatus = statusFilter === 'ALL' || inst.status === statusFilter
      return matchesType && matchesStatus
    })
  }, [instruments, typeFilter, statusFilter])

  // Expiring soon alerts (within 7 days)
  const expiringInstruments = useMemo(() => {
    return instruments.filter(inst => {
      if (!inst.expires_at || inst.status === 'EXPIRED' || inst.status === 'EXECUTED') return false
      const daysUntilExpiry = differenceInDays(new Date(inst.expires_at), new Date())
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7
    })
  }, [instruments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingId) {
        await updateInstrument(editingId, {
          instrument_type: formData.instrument_type,
          reference_no: formData.reference_no,
          issuing_authority: formData.issuing_authority,
          issued_at: formData.issued_at,
          expires_at: formData.expires_at || undefined,
          status: formData.status,
          scope_description: formData.scope_description,
          notes: formData.notes || undefined
        })
      } else {
        await createInstrument({
          instrument_type: formData.instrument_type,
          reference_no: formData.reference_no,
          issuing_authority: formData.issuing_authority,
          issued_at: formData.issued_at,
          expires_at: formData.expires_at || undefined,
          status: formData.status,
          scope_description: formData.scope_description,
          document: formData.document || undefined,
          notes: formData.notes || undefined
        })
      }

      resetForm()
      alert(editingId ? 'Instrument updated successfully' : 'Instrument created successfully')
    } catch (error) {
      console.error('Failed to save instrument:', error)
      alert('Failed to save instrument. This feature will be enabled when the backend API is ready.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this legal instrument?')) return
    
    try {
      await deleteInstrument(id)
    } catch (error) {
      console.error('Failed to delete instrument:', error)
      alert('Failed to delete instrument. This feature will be enabled when the backend API is ready.')
    }
  }

  const handleEdit = (instrument: any) => {
    setEditingId(instrument.id)
    setFormData({
      instrument_type: instrument.instrument_type,
      reference_no: instrument.reference_no,
      issuing_authority: instrument.issuing_authority,
      issued_at: new Date(instrument.issued_at).toISOString().slice(0, 16),
      expires_at: instrument.expires_at ? new Date(instrument.expires_at).toISOString().slice(0, 16) : '',
      status: instrument.status,
      scope_description: instrument.scope_description,
      document: null,
      notes: instrument.notes || ''
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      instrument_type: 'WARRANT',
      reference_no: '',
      issuing_authority: '',
      issued_at: new Date().toISOString().slice(0, 16),
      expires_at: '',
      status: 'REQUESTED',
      scope_description: '',
      document: null,
      notes: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getExpiryWarning = (expiresAt?: string) => {
    if (!expiresAt) return null
    
    const daysUntilExpiry = differenceInDays(new Date(expiresAt), new Date())
    
    if (daysUntilExpiry < 0) {
      return { level: 'expired', message: 'EXPIRED', color: 'text-red-700 bg-red-100' }
    } else if (daysUntilExpiry === 0) {
      return { level: 'urgent', message: 'Expires today', color: 'text-red-700 bg-red-100' }
    } else if (daysUntilExpiry <= 3) {
      return { level: 'critical', message: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`, color: 'text-orange-700 bg-orange-100' }
    } else if (daysUntilExpiry <= 7) {
      return { level: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-700 bg-yellow-100' }
    }
    
    return null
  }

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Loading legal instruments...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Legal Instruments</h2>
            <p className="text-sm text-neutral-600">{filteredInstruments.length} instrument{filteredInstruments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow ${
              showFilters
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 font-medium"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Instrument'}
          </button>
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiringInstruments.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">Instruments Expiring Soon</h3>
              <div className="space-y-2">
                {expiringInstruments.map(inst => {
                  const warning = getExpiryWarning(inst.expires_at)
                  return (
                    <div key={inst.id} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm">
                      <span className="font-medium text-neutral-900">{inst.reference_no}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${warning?.color}`}>
                        {warning?.message}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Instrument Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InstrumentType | 'ALL')}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">All Types</option>
              {Object.entries(INSTRUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InstrumentStatus | 'ALL')}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(INSTRUMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">
            {editingId ? 'Edit Legal Instrument' : 'Add New Legal Instrument'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Instrument Type *
                </label>
                <select
                  value={formData.instrument_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, instrument_type: e.target.value as InstrumentType }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {Object.entries(INSTRUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as InstrumentStatus }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {Object.entries(INSTRUMENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Reference Number *
                </label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., FHC/ABJ/CR/2025/0127"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Issuing Authority *
                </label>
                <input
                  type="text"
                  value={formData.issuing_authority}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuing_authority: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Federal High Court, Abuja"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Issued Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.issued_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, issued_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Expires Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Scope Description *
              </label>
              <textarea
                value={formData.scope_description}
                onChange={(e) => setFormData(prev => ({ ...prev, scope_description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={4}
                required
                placeholder="Detailed description of the instrument's scope and authority..."
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Document Upload (Optional, will be hashed with SHA-256)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.files?.[0] || null }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 file:cursor-pointer cursor-pointer"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingId ? 'Update Instrument' : 'Add Instrument'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Instruments List */}
      {filteredInstruments.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Scale className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No legal instruments found</p>
          <p className="text-sm text-neutral-500">
            {typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Add your first legal instrument to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInstruments.map(instrument => {
            const expiryWarning = getExpiryWarning(instrument.expires_at)
            const statusColor = STATUS_COLORS[instrument.status]
            
            return (
              <div
                key={instrument.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${TYPE_COLORS[instrument.instrument_type]} flex items-center justify-center flex-shrink-0`}>
                      <Scale className="w-6 h-6 text-neutral-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-neutral-900">{instrument.reference_no}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                          {INSTRUMENT_TYPE_LABELS[instrument.instrument_type]}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                          {INSTRUMENT_STATUS_LABELS[instrument.status]}
                        </span>
                        {expiryWarning && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${expiryWarning.color}`}>
                            <Clock className="w-3 h-3" />
                            {expiryWarning.message}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-1">{instrument.issuing_authority}</p>
                      <p className="text-sm text-neutral-700 mb-2">{instrument.scope_description}</p>
                      <div className="text-xs text-neutral-600 space-y-1">
                        <p>📅 Issued: {format(new Date(instrument.issued_at), 'PPp')}</p>
                        {instrument.expires_at && (
                          <p>⏰ Expires: {format(new Date(instrument.expires_at), 'PPp')}</p>
                        )}
                        {instrument.document_file_name && (
                          <>
                            <p className="font-mono">📎 {instrument.document_file_name} ({formatFileSize(instrument.document_file_size!)})</p>
                            <p className="font-mono break-all">🔒 SHA-256: {instrument.document_hash}</p>
                          </>
                        )}
                        {instrument.notes && (
                          <div className="mt-2 p-2 bg-neutral-50 rounded">
                            <strong>Notes:</strong> {instrument.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(instrument)}
                      className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                      title="Edit instrument"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(instrument.id)}
                      className="p-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                      title="Delete instrument"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
