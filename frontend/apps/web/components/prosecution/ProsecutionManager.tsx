'use client'

import { useState } from 'react'
import { useCharges, useChargeMutations, CYBERCRIMES_ACT_SECTIONS } from '@/lib/hooks/useCharges'
import { Gavel, Plus, X, Trash2, Edit, AlertCircle, Calendar, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface ProsecutionManagerProps {
  caseId: string
}

type ChargeStatus = 'FILED' | 'WITHDRAWN' | 'AMENDED'

const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  FILED: 'Filed',
  WITHDRAWN: 'Withdrawn',
  AMENDED: 'Amended'
}

const STATUS_COLORS: Record<ChargeStatus, { bg: string; text: string }> = {
  FILED: { bg: 'bg-green-100', text: 'text-green-800' },
  WITHDRAWN: { bg: 'bg-gray-100', text: 'text-gray-800' },
  AMENDED: { bg: 'bg-blue-100', text: 'text-blue-800' }
}

export default function ProsecutionManager({ caseId }: ProsecutionManagerProps) {
  const { data: charges = [], isLoading } = useCharges(caseId)
  const { createCharge, updateCharge, deleteCharge, loading } = useChargeMutations(caseId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ChargeStatus | 'ALL'>('ALL')

  // Form state
  const [formData, setFormData] = useState({
    statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
    statute_section: '',
    description: '',
    filed_at: new Date().toISOString().slice(0, 16),
    status: 'FILED' as ChargeStatus,
    notes: ''
  })

  // Filtered charges
  const filteredCharges = charges.filter(charge => 
    statusFilter === 'ALL' || charge.status === statusFilter
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingId) {
        await updateCharge(editingId, {
          statute: formData.statute,
          statute_section: formData.statute_section,
          description: formData.description,
          filed_at: formData.filed_at,
          status: formData.status,
          notes: formData.notes || undefined
        })
      } else {
        await createCharge({
          statute: formData.statute,
          statute_section: formData.statute_section,
          description: formData.description,
          filed_at: formData.filed_at,
          status: formData.status,
          notes: formData.notes || undefined
        })
      }

      resetForm()
      alert(editingId ? 'Charge updated successfully' : 'Charge filed successfully')
    } catch (error) {
      console.error('Failed to save charge:', error)
      alert('Failed to save charge. This feature will be enabled when the backend API is ready.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return
    
    try {
      await deleteCharge(id)
    } catch (error) {
      console.error('Failed to delete charge:', error)
      alert('Failed to delete charge. This feature will be enabled when the backend API is ready.')
    }
  }

  const handleEdit = (charge: any) => {
    setEditingId(charge.id)
    setFormData({
      statute: charge.statute,
      statute_section: charge.statute_section,
      description: charge.description,
      filed_at: new Date(charge.filed_at).toISOString().slice(0, 16),
      status: charge.status,
      notes: charge.notes || ''
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
      statute_section: '',
      description: '',
      filed_at: new Date().toISOString().slice(0, 16),
      status: 'FILED',
      notes: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Loading prosecution information...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Prosecution & Charges</h2>
            <p className="text-sm text-neutral-600">{filteredCharges.length} charge{filteredCharges.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ChargeStatus | 'ALL')}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 font-medium"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'File Charge'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">
            {editingId ? 'Edit Charge' : 'File New Charge'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Statute *
                </label>
                <input
                  type="text"
                  value={formData.statute}
                  onChange={(e) => setFormData(prev => ({ ...prev, statute: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Section *
                </label>
                <select
                  value={formData.statute_section}
                  onChange={(e) => setFormData(prev => ({ ...prev, statute_section: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select section...</option>
                  {CYBERCRIMES_ACT_SECTIONS.map(section => (
                    <option key={section.value} value={section.value}>
                      {section.label}
                    </option>
                  ))}
                </select>
                {formData.statute_section && (
                  <p className="text-xs text-neutral-600 mt-1">
                    {CYBERCRIMES_ACT_SECTIONS.find(s => s.value === formData.statute_section)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Filed Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.filed_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, filed_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ChargeStatus }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                required
                placeholder="Detailed description of the charge..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Additional notes, evidence references, etc..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingId ? 'Update Charge' : 'File Charge'}
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

      {/* Charges List */}
      {filteredCharges.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Gavel className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No charges filed</p>
          <p className="text-sm text-neutral-500">
            {statusFilter !== 'ALL'
              ? 'Try adjusting your filter'
              : 'File your first charge to begin prosecution'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCharges.map(charge => {
            const statusColor = STATUS_COLORS[charge.status]
            
            return (
              <div
                key={charge.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Gavel className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-neutral-900">{charge.statute_section}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                          {CHARGE_STATUS_LABELS[charge.status]}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-1 font-medium">{charge.statute}</p>
                      <p className="text-sm text-neutral-700 mb-2">{charge.description}</p>
                      <div className="text-xs text-neutral-600 space-y-1">
                        <p>📅 Filed: {format(new Date(charge.filed_at), 'PPp')}</p>
                        <p>👤 Filed by: {charge.created_by_name}</p>
                        {charge.notes && (
                          <div className="mt-2 p-2 bg-neutral-50 rounded">
                            <strong>Notes:</strong> {charge.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(charge)}
                      className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                      title="Edit charge"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(charge.id)}
                      className="p-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                      title="Delete charge"
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

      {/* Court Sessions & Outcomes Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Court Sessions */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">Court Sessions</h3>
          </div>
          <p className="text-sm text-blue-800 mb-4">Track upcoming court appearances and hearings.</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 active:scale-95 transition-all font-medium text-sm">
            Schedule Session
          </button>
        </div>

        {/* Case Outcome */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Case Outcome</h3>
          </div>
          <p className="text-sm text-green-800 mb-4">Record final disposition when case concludes.</p>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-green-700 active:scale-95 transition-all font-medium text-sm">
            Record Outcome
          </button>
        </div>
      </div>
    </div>
  )
}
