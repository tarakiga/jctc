'use client'

import { useState } from 'react'
import { useArtefacts, useArtefactMutations } from '@/lib/hooks/useArtefacts'
import { useDevices } from '@/lib/hooks/useDevices'
import { FileText, Search, Plus, X, Trash2, Link, Tag, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface ArtefactManagerProps {
  caseId: string
}

type ArtefactType = 'CHAT_LOG' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'BROWSER_HISTORY' | 'OTHER'
type SourceTool = 'XRY' | 'XAMN' | 'FTK' | 'AUTOPSY' | 'ENCASE' | 'CELLEBRITE' | 'OTHER'

const ARTEFACT_TYPE_LABELS: Record<ArtefactType, string> = {
  CHAT_LOG: 'Chat Log',
  IMAGE: 'Image',
  VIDEO: 'Video',
  DOCUMENT: 'Document',
  BROWSER_HISTORY: 'Browser History',
  OTHER: 'Other'
}

const SOURCE_TOOL_LABELS: Record<SourceTool, string> = {
  XRY: 'XRY',
  XAMN: 'XAMN',
  FTK: 'FTK Imager',
  AUTOPSY: 'Autopsy',
  ENCASE: 'EnCase',
  CELLEBRITE: 'Cellebrite',
  OTHER: 'Other'
}

const ARTEFACT_TYPE_COLORS: Record<ArtefactType, string> = {
  CHAT_LOG: 'from-blue-50 to-cyan-50',
  IMAGE: 'from-green-50 to-emerald-50',
  VIDEO: 'from-purple-50 to-violet-50',
  DOCUMENT: 'from-orange-50 to-amber-50',
  BROWSER_HISTORY: 'from-pink-50 to-rose-50',
  OTHER: 'from-gray-50 to-neutral-50'
}

export default function ArtefactManager({ caseId }: ArtefactManagerProps) {
  const { data: artefacts = [], isLoading } = useArtefacts(caseId)
  const { data: devices = [] } = useDevices(caseId)
  const { createArtefact, updateArtefact, deleteArtefact, loading } = useArtefactMutations(caseId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ArtefactType | 'ALL'>('ALL')
  const [toolFilter, setToolFilter] = useState<SourceTool | 'ALL'>('ALL')
  const [deviceFilter, setDeviceFilter] = useState<string | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    artefact_type: 'DOCUMENT' as ArtefactType,
    source_tool: 'FTK' as SourceTool,
    description: '',
    file: null as File | null,
    device_id: '',
    tags: [] as string[],
    extracted_at: new Date().toISOString().slice(0, 16)
  })
  const [tagInput, setTagInput] = useState('')

  // Filtered artefacts
  const filteredArtefacts = artefacts.filter(artefact => {
    const matchesSearch = searchQuery === '' || 
      artefact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artefact.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artefact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = typeFilter === 'ALL' || artefact.artefact_type === typeFilter
    const matchesTool = toolFilter === 'ALL' || artefact.source_tool === toolFilter
    const matchesDevice = deviceFilter === 'ALL' || artefact.device_id === deviceFilter

    return matchesSearch && matchesType && matchesTool && matchesDevice
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.file && !editingId) {
      alert('Please select a file')
      return
    }

    try {
      if (editingId) {
        await updateArtefact(editingId, {
          artefact_type: formData.artefact_type,
          source_tool: formData.source_tool,
          description: formData.description,
          tags: formData.tags,
          extracted_at: formData.extracted_at
        })
      } else {
        await createArtefact({
          artefact_type: formData.artefact_type,
          source_tool: formData.source_tool,
          description: formData.description,
          file: formData.file!,
          tags: formData.tags,
          extracted_at: formData.extracted_at,
          device_id: formData.device_id || undefined
        })
      }

      resetForm()
    } catch (error) {
      console.error('Failed to save artefact:', error)
      alert('Failed to save artefact')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this artefact?')) return
    
    try {
      await deleteArtefact(id)
    } catch (error) {
      console.error('Failed to delete artefact:', error)
      alert('Failed to delete artefact')
    }
  }

  const handleEdit = (artefact: any) => {
    setEditingId(artefact.id)
    setFormData({
      artefact_type: artefact.artefact_type,
      source_tool: artefact.source_tool,
      description: artefact.description,
      file: null,
      device_id: artefact.device_id || '',
      tags: artefact.tags,
      extracted_at: new Date(artefact.extracted_at).toISOString().slice(0, 16)
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      artefact_type: 'DOCUMENT',
      source_tool: 'FTK',
      description: '',
      file: null,
      device_id: '',
      tags: [],
      extracted_at: new Date().toISOString().slice(0, 16)
    })
    setTagInput('')
    setEditingId(null)
    setShowAddForm(false)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Loading artefacts...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Forensic Artefacts</h2>
            <p className="text-sm text-neutral-600">{filteredArtefacts.length} artefact{filteredArtefacts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 font-medium"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add Artefact'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artefacts by description, filename, or tags..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow ${
              showFilters
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Artefact Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ArtefactType | 'ALL')}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">All Types</option>
                {Object.entries(ARTEFACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Source Tool</label>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value as SourceTool | 'ALL')}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">All Tools</option>
                {Object.entries(SOURCE_TOOL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Device</label>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">All Devices</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>{device.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">
            {editingId ? 'Edit Artefact' : 'Add New Artefact'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Artefact Type *
                </label>
                <select
                  value={formData.artefact_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, artefact_type: e.target.value as ArtefactType }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {Object.entries(ARTEFACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Source Tool *
                </label>
                <select
                  value={formData.source_tool}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_tool: e.target.value as SourceTool }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {Object.entries(SOURCE_TOOL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Extracted Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.extracted_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, extracted_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Link to Device (Optional)
                </label>
                <select
                  value={formData.device_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No device</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>{device.label}</option>
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
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                required
                placeholder="Describe the artefact and its significance..."
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  File Upload * (will be hashed with SHA-256)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add tags..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg shadow-sm hover:shadow font-medium transition-all active:scale-95"
                >
                  Add Tag
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-indigo-900 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingId ? 'Update Artefact' : 'Add Artefact'}
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

      {/* Artefacts List */}
      {filteredArtefacts.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No artefacts found</p>
          <p className="text-sm text-neutral-500">
            {searchQuery || typeFilter !== 'ALL' || toolFilter !== 'ALL' || deviceFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Add your first forensic artefact to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredArtefacts.map(artefact => (
            <div
              key={artefact.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ARTEFACT_TYPE_COLORS[artefact.artefact_type]} flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-6 h-6 text-neutral-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        {ARTEFACT_TYPE_LABELS[artefact.artefact_type]}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {SOURCE_TOOL_LABELS[artefact.source_tool]}
                      </span>
                      {artefact.device_label && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Link className="w-3 h-3" />
                          {artefact.device_label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-900 font-medium mb-2">{artefact.description}</p>
                    {artefact.file_name && (
                      <div className="text-xs text-neutral-600 space-y-1">
                        <p className="font-mono">📎 {artefact.file_name} ({formatFileSize(artefact.file_size ?? 0)})</p>
                        <p className="font-mono break-all">🔒 SHA-256: {artefact.file_hash}</p>
                        <p>📅 Extracted: {format(new Date(artefact.extracted_at), 'PPp')}</p>
                      </div>
                    )}
                    {artefact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {artefact.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded text-xs"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(artefact)}
                    className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                    title="Edit artefact"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(artefact.id)}
                    className="p-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                    title="Delete artefact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
