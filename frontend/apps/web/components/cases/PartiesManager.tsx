'use client'

import { useState } from 'react'
import { Button, Badge } from '@jctc/ui'
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/lib/utils/countries'
import { useLookup, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DatePicker } from '@/components/ui/DatePicker'

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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Fetch party_type lookup values
  const partyTypeLookup = useLookup(LOOKUP_CATEGORIES.PARTY_TYPE)

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
    <div className="space-y-6">
      {/* Header with Filter and Add Button */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PartyType | 'ALL')}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white hover:border-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
          >
            <option value="ALL">All Parties ({parties.length})</option>
            <option value="SUSPECT">Suspects ({parties.filter((p) => p.party_type === 'SUSPECT').length})</option>
            <option value="VICTIM">Victims ({parties.filter((p) => p.party_type === 'VICTIM').length})</option>
            <option value="WITNESS">Witnesses ({parties.filter((p) => p.party_type === 'WITNESS').length})</option>
            <option value="COMPLAINANT">Complainants ({parties.filter((p) => p.party_type === 'COMPLAINANT').length})</option>
          </select>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Party
        </Button>
      </div>

      {/* Premium Table */}
      {filteredParties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No parties found</h3>
            <p className="text-slate-600 mb-6">
              {filterType !== 'ALL'
                ? `No ${filterType.toLowerCase()}s in this case yet.`
                : 'Add parties involved in this case to get started.'}
            </p>
            <Button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Party
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-36">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-36">
                    Age/DOB
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Flags
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-16">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParties.map((party) => {
                  const age = party.dob ? new Date().getFullYear() - new Date(party.dob).getFullYear() : null
                  const isMinorFlag = party.dob && isMinor(party.dob)

                  return (
                    <tr key={party.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Name Column */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {party.full_name || party.alias || 'Unnamed'}
                          </p>
                          {party.alias && party.full_name && (
                            <p className="text-xs text-slate-500">aka {party.alias}</p>
                          )}
                          {party.nationality && (
                            <p className="text-xs text-slate-500">{party.nationality}</p>
                          )}
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${party.party_type === 'SUSPECT' ? 'bg-red-100 text-red-700' :
                          party.party_type === 'VICTIM' ? 'bg-blue-100 text-blue-700' :
                            party.party_type === 'WITNESS' ? 'bg-slate-100 text-slate-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                          {party.party_type}
                        </span>
                      </td>

                      {/* Age/DOB Column */}
                      <td className="px-6 py-4">
                        {party.dob ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {age} years
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(party.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Contact Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {party.contact?.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {party.contact.phone}
                            </div>
                          )}
                          {party.contact?.email && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {party.contact.email}
                            </div>
                          )}
                          {!party.contact?.phone && !party.contact?.email && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </div>
                      </td>

                      {/* Flags Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {isMinorFlag && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                              Minor
                            </span>
                          )}
                          {party.guardian_contact?.name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              Guardian
                            </span>
                          )}
                          {party.safeguarding_flags && party.safeguarding_flags.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Safeguarding
                            </span>
                          )}
                          {!isMinorFlag && !party.guardian_contact?.name && (!party.safeguarding_flags || party.safeguarding_flags.length === 0) && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-3 py-4 text-center relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === party.id ? null : party.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdownId === party.id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdownId(null)}
                            />

                            {/* Dropdown */}
                            <div className="absolute right-8 top-12 z-20 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1">
                              <button
                                onClick={() => {
                                  handleOpenModal(party)
                                  setOpenDropdownId(null)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                              >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Party
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => {
                                  handleDelete(party.id)
                                  setOpenDropdownId(null)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Party
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    <option value="">Select Type</option>
                    {partyTypeLookup.values.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
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
                    <DatePicker
                      label="Date of Birth"
                      value={formData.dob || ''}
                      onChange={(value) => setFormData({ ...formData, dob: value })}
                      placeholder="Select date of birth"
                      maxDate={new Date()}
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
                    <select
                      value={formData.nationality || DEFAULT_COUNTRY_CODE}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
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
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${formData.safeguarding_flags?.includes(flag)
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
