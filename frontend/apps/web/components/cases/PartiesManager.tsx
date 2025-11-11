'use client'

import { useState } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'

// Party types
type PartyType = 'SUSPECT' | 'VICTIM' | 'WITNESS' | 'COMPLAINANT'
type Gender = 'M' | 'F' | 'Other' | 'Unspecified'

interface Party {
  id: string
  party_type: PartyType
  full_name?: string
  alias?: string
  dob?: string
  nationality?: string
  gender?: Gender
  national_id?: string
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  guardian_contact?: {
    name?: string
    phone?: string
    email?: string
    relationship?: string
  }
  safeguarding_flags?: string[]
  notes?: string
}

interface PartiesManagerProps {
  caseId: string
  parties: Party[]
  onAdd: (party: Omit<Party, 'id'>) => Promise<void>
  onEdit: (id: string, party: Partial<Party>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function PartiesManager({ caseId, parties, onAdd, onEdit, onDelete }: PartiesManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [filterType, setFilterType] = useState<PartyType | 'ALL'>('ALL')
  const [formData, setFormData] = useState<Omit<Party, 'id'>>({
    party_type: 'SUSPECT',
    full_name: '',
    alias: '',
    dob: '',
    nationality: '',
    gender: 'Unspecified',
    national_id: '',
    contact: {},
    guardian_contact: {},
    safeguarding_flags: [],
    notes: '',
  })

  const handleOpenModal = (party?: Party) => {
    if (party) {
      setEditingParty(party)
      setFormData(party)
    } else {
      setEditingParty(null)
      setFormData({
        party_type: 'SUSPECT',
        full_name: '',
        alias: '',
        dob: '',
        nationality: '',
        gender: 'Unspecified',
        national_id: '',
        contact: {},
        guardian_contact: {},
        safeguarding_flags: [],
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingParty(null)
  }

  const isMinor = (dob: string) => {
    if (!dob) return false
    const birthDate = new Date(dob)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 18
    }
    return age < 18
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate minor guardian contact
    if (formData.party_type === 'VICTIM' && formData.dob && isMinor(formData.dob)) {
      if (!formData.guardian_contact?.name || !formData.guardian_contact?.phone) {
        alert('Guardian contact information is required for victims under 18 years old')
        return
      }
    }

    try {
      if (editingParty) {
        await onEdit(editingParty.id, formData)
      } else {
        await onAdd(formData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving party:', error)
      alert('Failed to save party information')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this party?')) {
      try {
        await onDelete(id)
      } catch (error) {
        console.error('Error deleting party:', error)
        alert('Failed to delete party')
      }
    }
  }

  const toggleSafeguardingFlag = (flag: string) => {
    setFormData((prev) => {
      const flags = prev.safeguarding_flags || []
      if (flags.includes(flag)) {
        return { ...prev, safeguarding_flags: flags.filter((f) => f !== flag) }
      } else {
        return { ...prev, safeguarding_flags: [...flags, flag] }
      }
    })
  }

  const getPartyTypeBadge = (type: PartyType) => {
    const variants = {
      SUSPECT: 'critical' as const,
      VICTIM: 'info' as const,
      WITNESS: 'default' as const,
      COMPLAINANT: 'warning' as const,
    }
    return <Badge variant={variants[type]}>{type}</Badge>
  }

  const filteredParties = parties.filter(
    (party) => filterType === 'ALL' || party.party_type === filterType
  )

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filter */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PartyType | 'ALL')}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="ALL">All Parties ({parties.length})</option>
            <option value="SUSPECT">Suspects ({parties.filter((p) => p.party_type === 'SUSPECT').length})</option>
            <option value="VICTIM">Victims ({parties.filter((p) => p.party_type === 'VICTIM').length})</option>
            <option value="WITNESS">Witnesses ({parties.filter((p) => p.party_type === 'WITNESS').length})</option>
            <option value="COMPLAINANT">Complainants ({parties.filter((p) => p.party_type === 'COMPLAINANT').length})</option>
          </select>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-black text-white hover:bg-neutral-800">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Party
        </Button>
      </div>

      {/* Parties List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredParties.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-neutral-500">
              No parties added yet. Click "Add Party" to get started.
            </CardContent>
          </Card>
        ) : (
          filteredParties.map((party) => (
            <Card key={party.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getPartyTypeBadge(party.party_type)}
                      {party.dob && isMinor(party.dob) && (
                        <Badge variant="warning">Minor</Badge>
                      )}
                      {party.safeguarding_flags && party.safeguarding_flags.length > 0 && (
                        <Badge variant="critical">Safeguarding Required</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">
                        {party.full_name || party.alias || 'Unnamed'}
                        {party.alias && party.full_name && (
                          <span className="text-neutral-500 font-normal text-sm ml-2">
                            (aka {party.alias})
                          </span>
                        )}
                      </p>
                      {party.dob && (
                        <p className="text-sm text-neutral-600">
                          DOB: {new Date(party.dob).toLocaleDateString()}
                          {isMinor(party.dob) && (
                            <span className="ml-2 text-orange-600 font-medium">
                              (Age: {new Date().getFullYear() - new Date(party.dob).getFullYear()})
                            </span>
                          )}
                        </p>
                      )}
                      {party.nationality && (
                        <p className="text-sm text-neutral-600">Nationality: {party.nationality}</p>
                      )}
                      {party.contact?.phone && (
                        <p className="text-sm text-neutral-600">Phone: {party.contact.phone}</p>
                      )}
                      {party.contact?.email && (
                        <p className="text-sm text-neutral-600">Email: {party.contact.email}</p>
                      )}
                      {party.guardian_contact?.name && (
                        <div className="mt-2 pt-2 border-t border-neutral-200">
                          <p className="text-sm text-neutral-700 font-medium">Guardian: {party.guardian_contact.name}</p>
                          {party.guardian_contact.phone && (
                            <p className="text-sm text-neutral-600">Guardian Phone: {party.guardian_contact.phone}</p>
                          )}
                        </div>
                      )}
                      {party.safeguarding_flags && party.safeguarding_flags.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {party.safeguarding_flags.map((flag) => (
                            <Badge key={flag} variant="warning" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(party)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(party.id)} className="text-red-600 hover:text-red-700">
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">
                  {editingParty ? 'Edit Party' : 'Add Party'}
                </h2>
                <p className="text-slate-600 mt-1">Fill in the party information</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Party Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Party Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.party_type}
                    onChange={(e) => setFormData({ ...formData, party_type: e.target.value as PartyType })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                  >
                    <option value="SUSPECT">Suspect</option>
                    <option value="VICTIM">Victim</option>
                    <option value="WITNESS">Witness</option>
                    <option value="COMPLAINANT">Complainant</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Full Name {formData.party_type !== 'SUSPECT' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={formData.party_type !== 'SUSPECT'}
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* Alias */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Alias / Username
                    </label>
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., @username, handle"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                    {formData.dob && isMinor(formData.dob) && (
                      <p className="text-sm text-orange-600 mt-1">⚠️ Minor detected - Guardian info required</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="Unspecified">Unspecified</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="e.g., Nigeria"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.contact?.phone || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, phone: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        placeholder="+234..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.contact?.email || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, email: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.contact?.address || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: { ...formData.contact, address: e.target.value },
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="Full address"
                    />
                  </div>
                </div>

                {/* Guardian Contact (for minors) */}
                {formData.party_type === 'VICTIM' && formData.dob && isMinor(formData.dob) && (
                  <div className="border-t border-slate-200 pt-6 bg-orange-50 -mx-8 px-8 py-6">
                    <h3 className="text-lg font-semibold text-orange-900 mb-4">
                      Guardian Contact Information <span className="text-red-500">*</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Guardian Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.guardian_contact?.name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_contact: { ...formData.guardian_contact, name: e.target.value },
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="Guardian's full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Guardian Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.guardian_contact?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_contact: { ...formData.guardian_contact, phone: e.target.value },
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="+234..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Guardian Email</label>
                        <input
                          type="email"
                          value={formData.guardian_contact?.email || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_contact: { ...formData.guardian_contact, email: e.target.value },
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Relationship</label>
                        <input
                          type="text"
                          value={formData.guardian_contact?.relationship || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_contact: { ...formData.guardian_contact, relationship: e.target.value },
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          placeholder="e.g., Parent, Legal Guardian"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Safeguarding Flags (for victims) */}
                {formData.party_type === 'VICTIM' && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Safeguarding Needs</h3>
                    <div className="flex gap-3 flex-wrap">
                      {['medical', 'shelter', 'counselling', 'legal-aid'].map((flag) => (
                        <button
                          key={flag}
                          type="button"
                          onClick={() => toggleSafeguardingFlag(flag)}
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                            formData.safeguarding_flags?.includes(flag)
                              ? 'border-orange-600 bg-orange-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {flag.charAt(0).toUpperCase() + flag.slice(1).replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Additional information about this party"
                  />
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  {editingParty ? 'Update Party' : 'Add Party'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
