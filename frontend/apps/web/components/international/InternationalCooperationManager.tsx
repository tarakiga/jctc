'use client'

import { useState } from 'react'
import { useInternationalRequests, COMMON_PROVIDERS } from '@/lib/hooks/useInternationalRequests'
import { Globe, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface InternationalCooperationManagerProps {
  caseId: string
}

export default function InternationalCooperationManager({ caseId }: InternationalCooperationManagerProps) {
  const { data: requests = [], isLoading } = useInternationalRequests(caseId)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MLAT' | 'PROVIDER_REQUEST'>('ALL')

  const filteredRequests = requests.filter(req => 
    typeFilter === 'ALL' || req.request_type === typeFilter
  )

  const mlatRequests = requests.filter(r => r.request_type === 'MLAT')
  const providerRequests = requests.filter(r => r.request_type === 'PROVIDER_REQUEST')

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Loading international requests...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">International Cooperation</h2>
            <p className="text-sm text-neutral-600">{mlatRequests.length} MLAT · {providerRequests.length} Provider Requests</p>
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm"
        >
          <option value="ALL">All Requests</option>
          <option value="MLAT">MLAT Only</option>
          <option value="PROVIDER_REQUEST">Provider Requests Only</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-900">MLAT Requests</h3>
          </div>
          <p className="text-2xl font-bold text-blue-900">{mlatRequests.length}</p>
          <p className="text-xs text-blue-700">Mutual Legal Assistance</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-900">Complied</h3>
          </div>
          <p className="text-2xl font-bold text-green-900">{requests.filter(r => r.status === 'COMPLIED').length}</p>
          <p className="text-xs text-green-700">Responses received</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-orange-900">Pending</h3>
          </div>
          <p className="text-2xl font-bold text-orange-900">{requests.filter(r => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED').length}</p>
          <p className="text-xs text-orange-700">Awaiting response</p>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Globe className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No international requests</p>
          <p className="text-sm text-neutral-500">Submit MLAT or provider requests for cross-border cases</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const isMLAT = request.request_type === 'MLAT'
            const statusColors = {
              PENDING: 'bg-yellow-100 text-yellow-800',
              ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
              COMPLIED: 'bg-green-100 text-green-800',
              REFUSED: 'bg-red-100 text-red-800',
              EXPIRED: 'bg-gray-100 text-gray-800'
            }
            
            return (
              <div
                key={request.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isMLAT ? 'from-purple-50 to-indigo-50' : 'from-cyan-50 to-blue-50'} flex items-center justify-center flex-shrink-0`}>
                    <Globe className="w-6 h-6 text-neutral-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        {isMLAT ? 'MLAT' : 'Provider Request'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[request.status]}`}>
                        {request.status}
                      </span>
                      {isMLAT ? (
                        <span className="text-sm text-neutral-600">
                          {request.requesting_state} → {request.requested_state}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-neutral-700">
                          {request.provider} - {request.provider_request_type}
                        </span>
                      )}
                    </div>

                    {isMLAT ? (
                      <>
                        <p className="text-sm text-neutral-700 mb-2">{request.scope}</p>
                        <div className="text-xs text-neutral-600 space-y-1">
                          <p>⚖️ Legal Basis: {request.legal_basis}</p>
                          <p>📧 POC: {request.poc_name} ({request.poc_email})</p>
                          <p>📅 Submitted: {format(new Date(request.submitted_at), 'PPp')}</p>
                          {request.response_due_at && (
                            <p>⏰ Due: {format(new Date(request.response_due_at), 'PPp')} ({differenceInDays(new Date(request.response_due_at), new Date())} days)</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-neutral-700 mb-2">Target: {request.target_identifier}</p>
                        <div className="text-xs text-neutral-600 space-y-1">
                          <p>📅 Submitted: {format(new Date(request.submitted_at), 'PPp')}</p>
                          {request.responded_at && (
                            <p className="text-green-700 font-medium">✅ Responded: {format(new Date(request.responded_at), 'PPp')} ({request.response_time_days} days)</p>
                          )}
                          {!request.responded_at && request.response_due_at && (
                            <p>⏰ Due: {format(new Date(request.response_due_at), 'PPp')}</p>
                          )}
                        </div>
                      </>
                    )}

                    {request.notes && (
                      <div className="mt-2 p-2 bg-neutral-50 rounded text-xs">
                        <strong>Notes:</strong> {request.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Provider Directory */}
      <div className="bg-gradient-to-br from-slate-50 to-neutral-50 border border-neutral-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">Provider Contact Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMMON_PROVIDERS.map(provider => (
            <div key={provider.value} className="bg-white rounded-lg p-3 border border-neutral-200">
              <p className="font-semibold text-neutral-900 text-sm">{provider.label}</p>
              <p className="text-xs text-neutral-600">📧 {provider.email}</p>
              <a href={provider.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Guidelines →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
