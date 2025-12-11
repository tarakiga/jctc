'use client'

import { useState, useEffect } from 'react'
import { useCharges, useChargeMutations, CYBERCRIMES_ACT_SECTIONS } from '@/lib/hooks/useCharges'
import { Gavel, Plus, X, Trash2, Edit, AlertCircle, Calendar, CheckCircle, Clock, Scale, User } from 'lucide-react'
import { format } from 'date-fns'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { apiClient } from '@/lib/services/api-client'

interface ProsecutionManagerProps {
  caseId: string
}

type ChargeStatus = 'FILED' | 'WITHDRAWN' | 'AMENDED'
type DispositionType = 'CONVICTED' | 'ACQUITTED' | 'PLEA' | 'DISMISSED'

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

const DISPOSITION_LABELS: Record<DispositionType, string> = {
  CONVICTED: 'Convicted',
  ACQUITTED: 'Acquitted',
  PLEA: 'Plea Bargain',
  DISMISSED: 'Dismissed'
}

const SESSION_TYPES = [
  'Arraignment',
  'Preliminary Hearing',
  'Pre-Trial Conference',
  'Motion Hearing',
  'Trial',
  'Sentencing',
  'Appeal Hearing',
  'Other'
]

interface CourtSession {
  id: string
  case_id: string
  session_date: string
  court: string
  judge: string
  session_type: string
  notes?: string
  created_at: string
}

interface CaseOutcome {
  id: string
  case_id: string
  disposition: DispositionType
  sentence?: string
  restitution?: number
  closed_at: string
  notes?: string
}

export default function ProsecutionManager({ caseId }: ProsecutionManagerProps) {
  const { data: charges = [], isLoading } = useCharges(caseId)
  const { createCharge, updateCharge, deleteCharge, loading } = useChargeMutations(caseId)

  // Fetch prosecution-related lookup values
  const {
    [LOOKUP_CATEGORIES.PROSECUTION_SECTION]: prosecutionSectionLookup,
    [LOOKUP_CATEGORIES.PROSECUTION_STATUS]: prosecutionStatusLookup,
    [LOOKUP_CATEGORIES.CHARGE_STATUS]: chargeStatusLookup
  } = useLookups([
    LOOKUP_CATEGORIES.PROSECUTION_SECTION,
    LOOKUP_CATEGORIES.PROSECUTION_STATUS,
    LOOKUP_CATEGORIES.CHARGE_STATUS
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ChargeStatus | 'ALL'>('ALL')

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [chargeToDelete, setChargeToDelete] = useState<{ id: string; description: string } | null>(null)

  // Court Sessions state
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessions, setSessions] = useState<CourtSession[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionFormData, setSessionFormData] = useState({
    session_date: new Date().toISOString().slice(0, 16),
    court: '',
    judge: '',
    session_type: 'Arraignment',
    notes: ''
  })

  // Outcome state
  const [showOutcomeForm, setShowOutcomeForm] = useState(false)
  const [outcome, setOutcome] = useState<CaseOutcome | null>(null)
  const [outcomeLoading, setOutcomeLoading] = useState(false)
  const [outcomeFormData, setOutcomeFormData] = useState({
    disposition: 'CONVICTED' as DispositionType,
    sentence: '',
    restitution: '',
    closed_at: new Date().toISOString().slice(0, 16),
    notes: ''
  })

  // Charge Form state
  const [formData, setFormData] = useState({
    statute: 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015',
    statute_section: '',
    description: '',
    filed_at: new Date().toISOString().slice(0, 16),
    status: 'FILED' as ChargeStatus,
    notes: ''
  })

  // Fetch court sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await apiClient.get<CourtSession[]>(`/cases/${caseId}/court-sessions/`)
        setSessions(data)
      } catch (error) {
        console.log('Court sessions not available yet')
        setSessions([])
      }
    }
    fetchSessions()
  }, [caseId])

  // Fetch case outcome
  useEffect(() => {
    const fetchOutcome = async () => {
      try {
        const data = await apiClient.get<CaseOutcome[]>(`/cases/${caseId}/outcomes/`)
        if (data && data.length > 0) {
          setOutcome(data[0])
        }
      } catch (error) {
        console.log('Case outcome not available yet')
        setOutcome(null)
      }
    }
    fetchOutcome()
  }, [caseId])

  // Handle court session submission
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSessionLoading(true)

    try {
      const newSession = await apiClient.post<CourtSession>(`/cases/${caseId}/court-sessions/`, {
        session_date: sessionFormData.session_date,
        court: sessionFormData.court,
        judge: sessionFormData.judge,
        session_type: sessionFormData.session_type,
        notes: sessionFormData.notes || undefined
      })

      setSessions(prev => [newSession, ...prev])
      setShowSessionForm(false)
      setSessionFormData({
        session_date: new Date().toISOString().slice(0, 16),
        court: '',
        judge: '',
        session_type: 'Arraignment',
        notes: ''
      })
    } catch (error) {
      console.error('Failed to schedule session:', error)
      alert('Failed to schedule court session.')
    } finally {
      setSessionLoading(false)
    }
  }

  // Handle outcome submission
  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOutcomeLoading(true)

    try {
      const newOutcome = await apiClient.post<CaseOutcome>(`/cases/${caseId}/outcomes/`, {
        disposition: outcomeFormData.disposition,
        sentence: outcomeFormData.sentence || undefined,
        restitution: outcomeFormData.restitution ? parseFloat(outcomeFormData.restitution) : undefined,
        closed_at: outcomeFormData.closed_at,
        notes: outcomeFormData.notes || undefined
      })

      setOutcome(newOutcome)
      setShowOutcomeForm(false)
    } catch (error) {
      console.error('Failed to record outcome:', error)
      alert('Failed to record case outcome.')
    } finally {
      setOutcomeLoading(false)
    }
  }

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

  const openDeleteModal = (charge: { id: string; statute_section: string; description: string }) => {
    setChargeToDelete({ id: charge.id, description: `${charge.statute_section}: ${charge.description.substring(0, 50)}...` })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!chargeToDelete) return

    try {
      await deleteCharge(chargeToDelete.id)
      setDeleteModalOpen(false)
      setChargeToDelete(null)
    } catch (error) {
      console.error('Failed to delete charge:', error)
      alert('Failed to delete charge.')
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
                <DateTimePicker
                  label="Filed Date & Time"
                  value={formData.filed_at}
                  onChange={(value) => setFormData(prev => ({ ...prev, filed_at: value }))}
                  required
                  placeholder="Select filed date and time"
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
                      onClick={() => openDeleteModal(charge)}
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

      {/* Court Sessions & Outcomes Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Court Sessions */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-blue-900">Court Sessions</h3>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{sessions.length} scheduled</span>
          </div>

          {showSessionForm ? (
            <form onSubmit={handleSessionSubmit} className="space-y-3">
              <div>
                <DateTimePicker
                  label="Session Date & Time"
                  value={sessionFormData.session_date}
                  onChange={(value) => setSessionFormData(prev => ({ ...prev, session_date: value }))}
                  required
                  placeholder="Select date and time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Court *</label>
                <input
                  type="text"
                  value={sessionFormData.court}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, court: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., Federal High Court, Lagos"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Judge</label>
                <input
                  type="text"
                  value={sessionFormData.judge}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, judge: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Presiding Judge"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Session Type *</label>
                <select
                  value={sessionFormData.session_type}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, session_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  {SESSION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Notes</label>
                <textarea
                  value={sessionFormData.notes}
                  onChange={(e) => setSessionFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={sessionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all font-medium text-sm disabled:opacity-50"
                >
                  {sessionLoading ? 'Scheduling...' : 'Schedule Session'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSessionForm(false)}
                  className="px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {sessions.length > 0 ? (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {sessions.map(session => (
                    <div key={session.id} className="bg-white/60 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900 text-sm">{session.session_type}</span>
                        <span className="text-xs text-blue-600">{format(new Date(session.session_date), 'PPp')}</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">{session.court}</p>
                      {session.judge && <p className="text-xs text-blue-600">Judge: {session.judge}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-800 mb-4">No court sessions scheduled yet.</p>
              )}
              <button
                onClick={() => setShowSessionForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 active:scale-95 transition-all font-medium text-sm"
              >
                <Plus className="w-4 h-4 inline-block mr-1" />
                Schedule Session
              </button>
            </>
          )}
        </div>

        {/* Case Outcome */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Case Outcome</h3>
          </div>

          {outcome ? (
            <div className="bg-white/60 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${outcome.disposition === 'CONVICTED' ? 'bg-red-100 text-red-800' :
                    outcome.disposition === 'ACQUITTED' ? 'bg-green-100 text-green-800' :
                      outcome.disposition === 'PLEA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                  }`}>
                  {DISPOSITION_LABELS[outcome.disposition]}
                </span>
              </div>
              {outcome.sentence && (
                <p className="text-sm text-green-800"><strong>Sentence:</strong> {outcome.sentence}</p>
              )}
              {outcome.restitution && (
                <p className="text-sm text-green-800"><strong>Restitution:</strong> ₦{outcome.restitution.toLocaleString()}</p>
              )}
              <p className="text-xs text-green-600 mt-2">Closed: {format(new Date(outcome.closed_at), 'PPp')}</p>
              {outcome.notes && (
                <p className="text-xs text-green-700 mt-1 italic">{outcome.notes}</p>
              )}
            </div>
          ) : showOutcomeForm ? (
            <form onSubmit={handleOutcomeSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">Disposition *</label>
                <select
                  value={outcomeFormData.disposition}
                  onChange={(e) => setOutcomeFormData(prev => ({ ...prev, disposition: e.target.value as DispositionType }))}
                  className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">Sentence</label>
                <input
                  type="text"
                  value={outcomeFormData.sentence}
                  onChange={(e) => setOutcomeFormData(prev => ({ ...prev, sentence: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="e.g., 5 years imprisonment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">Restitution (₦)</label>
                <input
                  type="number"
                  value={outcomeFormData.restitution}
                  onChange={(e) => setOutcomeFormData(prev => ({ ...prev, restitution: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Amount in Naira"
                />
              </div>
              <div>
                <DateTimePicker
                  label="Closed At"
                  value={outcomeFormData.closed_at}
                  onChange={(value) => setOutcomeFormData(prev => ({ ...prev, closed_at: value }))}
                  required
                  placeholder="Date case was closed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">Notes</label>
                <textarea
                  value={outcomeFormData.notes}
                  onChange={(e) => setOutcomeFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  rows={2}
                  placeholder="Additional outcome notes..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={outcomeLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 active:scale-95 transition-all font-medium text-sm disabled:opacity-50"
                >
                  {outcomeLoading ? 'Recording...' : 'Record Outcome'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOutcomeForm(false)}
                  className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 active:scale-95 transition-all font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-green-800 mb-4">Record the final disposition when the case concludes.</p>
              <button
                onClick={() => setShowOutcomeForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-green-700 active:scale-95 transition-all font-medium text-sm"
              >
                Record Outcome
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Delete Charge?</h3>
                <p className="text-sm text-neutral-600">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <p className="text-sm text-neutral-700">
                Are you sure you want to delete the charge:
              </p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">
                "{chargeToDelete?.description}"
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ This action is irreversible and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
