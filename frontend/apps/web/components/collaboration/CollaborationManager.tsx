'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  Plus,
  X,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  Pause,
  Shield,
  Globe2,
  Landmark,
  Wifi,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  useCollaborations,
  PARTNER_ORGANIZATIONS,
  type CollaborationStatus,
  type Collaboration
} from '@/lib/hooks/useCollaborations';
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup';

interface CollaborationManagerProps {
  caseId: string;
}

export default function CollaborationManager({ caseId }: CollaborationManagerProps) {
  const { collaborations, isLoading, createCollaboration, updateCollaboration, deleteCollaboration, isCreating, isDeleting } = useCollaborations(caseId);

  // Fetch collaboration-related lookup values
  const {
    [LOOKUP_CATEGORIES.PARTNER_ORGANIZATION]: partnerOrganizationLookup,
    [LOOKUP_CATEGORIES.COLLABORATION_STATUS]: collaborationStatusLookup
  } = useLookups([
    LOOKUP_CATEGORIES.PARTNER_ORGANIZATION,
    LOOKUP_CATEGORIES.COLLABORATION_STATUS
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    partner_org: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    reference_no: '',
    scope: '',
    mou_reference: '',
    notes: '',
    status: 'INITIATED' as CollaborationStatus,
  });
  const [filterPartnerType, setFilterPartnerType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<CollaborationStatus | 'ALL'>('ALL');

  // Get partner type icon
  const getPartnerTypeIcon = (type: string) => {
    const icons = {
      LAW_ENFORCEMENT: <Shield className="w-5 h-5" />,
      INTERNATIONAL: <Globe2 className="w-5 h-5" />,
      REGULATOR: <Building2 className="w-5 h-5" />,
      ISP: <Wifi className="w-5 h-5" />,
      BANK: <Landmark className="w-5 h-5" />,
      OTHER: <Building2 className="w-5 h-5" />,
    };
    return icons[type as keyof typeof icons] || <Building2 className="w-5 h-5" />;
  };

  // Get partner type badge color
  const getPartnerTypeBadge = (type: string) => {
    const badges = {
      LAW_ENFORCEMENT: 'bg-blue-100 text-blue-700',
      INTERNATIONAL: 'bg-purple-100 text-purple-700',
      REGULATOR: 'bg-green-100 text-green-700',
      ISP: 'bg-cyan-100 text-cyan-700',
      BANK: 'bg-amber-100 text-amber-700',
      OTHER: 'bg-neutral-100 text-neutral-700',
    };
    return badges[type as keyof typeof badges] || badges.OTHER;
  };

  // Get status badge
  const getStatusBadge = (status: CollaborationStatus) => {
    const badges = {
      INITIATED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
          <Clock className="w-3 h-3" />
          Initiated
        </span>
      ),
      ACTIVE: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      ),
      COMPLETED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-md">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      ),
      SUSPENDED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
          <Pause className="w-3 h-3" />
          Suspended
        </span>
      ),
    };
    return badges[status];
  };

  const handleSubmit = async () => {
    const partnerInfo = PARTNER_ORGANIZATIONS.find((p) => p.value === formData.partner_org);
    if (!partnerInfo) return;

    try {
      if (editingId) {
        await updateCollaboration({
          id: editingId,
          data: {
            ...formData,
            partner_type: partnerInfo.type as any,
            status: formData.status,
          },
        });
      } else {
        await createCollaboration({
          case_id: caseId,
          ...formData,
          partner_type: partnerInfo.type as any,
        });
      }

      // Reset form
      setShowForm(false);
      setEditingId(null);
      setFormData({
        partner_org: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        reference_no: '',
        scope: '',
        mou_reference: '',
        notes: '',
        status: 'INITIATED' as CollaborationStatus,
      });
    } catch (error) {
      console.error('Failed to save collaboration:', error);
    }
  };

  const handleEdit = (collab: Collaboration) => {
    setEditingId(collab.id);
    setFormData({
      partner_org: collab.partner_org,
      contact_person: collab.contact_person,
      contact_email: collab.contact_email,
      contact_phone: collab.contact_phone,
      reference_no: collab.reference_no || '',
      scope: collab.scope,
      mou_reference: collab.mou_reference || '',
      notes: collab.notes || '',
      status: collab.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this collaboration?')) {
      await deleteCollaboration(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      partner_org: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      reference_no: '',
      scope: '',
      mou_reference: '',
      notes: '',
      status: 'INITIATED' as CollaborationStatus,
    });
  };

  // Filter collaborations
  const filteredCollaborations = collaborations.filter((collab) => {
    if (filterPartnerType !== 'ALL' && collab.partner_type !== filterPartnerType) return false;
    if (filterStatus !== 'ALL' && collab.status !== filterStatus) return false;
    return true;
  });

  // Get unique partner types for filtering
  const partnerTypes = Array.from(new Set(collaborations.map((c) => c.partner_type)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Inter-Agency Collaboration</h2>
          <p className="text-sm text-neutral-600 mt-1">Track partnerships with law enforcement, regulators, ISPs, and other organizations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-black text-white hover:bg-neutral-800 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Collaboration
            </>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">
            {editingId ? 'Edit Collaboration' : 'New Collaboration'}
          </h3>

          <div className="space-y-4">
            {/* Partner Organization */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Partner Organization *
              </label>
              <select
                value={formData.partner_org}
                onChange={(e) => setFormData({ ...formData, partner_org: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              >
                <option value="">Select partner organization</option>
                {PARTNER_ORGANIZATIONS.map((org) => (
                  <option key={org.value} value={org.value}>
                    {org.label}
                  </option>
                ))}
              </select>
              {formData.partner_org && (
                <p className="text-xs text-neutral-600 mt-1">
                  Partner Type: <span className="font-semibold">
                    {PARTNER_ORGANIZATIONS.find(o => o.value === formData.partner_org)?.type.replace('_', ' ')}
                  </span>
                </p>
              )}
            </div>

            {/* Status (only show when editing) */}
            {editingId && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Collaboration Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CollaborationStatus })}
                  className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="INITIATED">Initiated</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <p className="text-xs text-neutral-600 mt-1">
                  Update the collaboration status to reflect current state
                </p>
              </div>
            )}

            {/* Contact Details - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="+234-xxx-xxx-xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="Partner's case/ticket reference"
                />
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Scope of Collaboration *
              </label>
              <textarea
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Describe what assistance is being requested/provided..."
              />
            </div>

            {/* MoU Reference */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                MoU Reference
              </label>
              <input
                type="text"
                value={formData.mou_reference}
                onChange={(e) => setFormData({ ...formData, mou_reference: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Reference to governing MoU or framework agreement"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Additional notes or coordination details..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!formData.partner_org || !formData.contact_person || !formData.contact_email || !formData.contact_phone || !formData.scope || isCreating}
                className="px-6 py-2 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editingId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-neutral-700">Filter:</span>

        {/* Partner Type Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterPartnerType('ALL')}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${filterPartnerType === 'ALL'
                ? 'bg-black text-white shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
              }`}
          >
            All Types ({collaborations.length})
          </button>
          {partnerTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterPartnerType(type)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${filterPartnerType === type
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
                }`}
            >
              {type.replace('_', ' ')} ({collaborations.filter(c => c.partner_type === type).length})
            </button>
          ))}
        </div>

        <span className="text-neutral-300">|</span>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {(['ALL', 'INITIATED', 'ACTIVE', 'COMPLETED', 'SUSPENDED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${filterStatus === status
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
                }`}
            >
              {status === 'ALL' ? 'All Status' : status.charAt(0) + status.slice(1).toLowerCase()}
              {status === 'ALL' ? ` (${collaborations.length})` : ` (${collaborations.filter(c => c.status === status).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Collaborations List */}
      {filteredCollaborations.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Users className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600">
            {collaborations.length === 0
              ? 'No collaborations tracked yet'
              : 'No collaborations match the selected filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCollaborations.map((collab) => {
            const partnerInfo = PARTNER_ORGANIZATIONS.find((p) => p.value === collab.partner_org);

            return (
              <div
                key={collab.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${getPartnerTypeBadge(collab.partner_type)} bg-opacity-20`}>
                    {getPartnerTypeIcon(collab.partner_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-neutral-900 text-lg mb-1">
                          {partnerInfo?.label || collab.partner_org}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPartnerTypeBadge(collab.partner_type)}`}>
                            {collab.partner_type.replace('_', ' ')}
                          </span>
                          {getStatusBadge(collab.status)}
                          {collab.reference_no && (
                            <span className="text-xs text-neutral-600">
                              Ref: {collab.reference_no}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(collab)}
                          className="p-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(collab.id)}
                          disabled={isDeleting}
                          className="p-2 bg-white hover:bg-red-50 text-red-600 border border-neutral-300 hover:border-red-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scope */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-neutral-700 mb-1">Scope of Collaboration:</p>
                      <p className="text-sm text-neutral-600">{collab.scope}</p>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-neutral-500">Contact Person</p>
                          <p className="text-sm text-neutral-900">{collab.contact_person}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-neutral-500">Email</p>
                          <a href={`mailto:${collab.contact_email}`} className="text-sm text-blue-600 hover:underline">
                            {collab.contact_email}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-neutral-500">Phone</p>
                          <a href={`tel:${collab.contact_phone}`} className="text-sm text-blue-600 hover:underline">
                            {collab.contact_phone}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-600 pt-3 border-t border-neutral-200">
                      <div>
                        <span className="font-medium">Initiated:</span> {format(new Date(collab.initiated_at), 'PPp')}
                      </div>
                      {collab.completed_at && (
                        <div>
                          <span className="font-medium">Completed:</span> {format(new Date(collab.completed_at), 'PPp')}
                        </div>
                      )}
                      {collab.mou_reference && (
                        <div className="col-span-2">
                          <span className="font-medium">MoU:</span> {collab.mou_reference}
                        </div>
                      )}
                      {collab.notes && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="font-medium">Notes:</span> {collab.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
