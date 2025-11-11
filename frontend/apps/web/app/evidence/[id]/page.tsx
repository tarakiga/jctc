'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { useEvidenceItem } from '@/lib/hooks/useEvidence'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'

function EvidenceDetailContent() {
  const params = useParams()
  const router = useRouter()
  const evidenceId = params.id as string

  const { evidence, loading, error } = useEvidenceItem(evidenceId)

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/evidence">
                <h1 className="text-2xl font-bold text-primary-600">JCTC</h1>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-neutral-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !evidence) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/evidence">
                <h1 className="text-2xl font-bold text-primary-600">JCTC</h1>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Evidence</h3>
            <p className="text-red-600 mb-4">{error?.message || 'Evidence not found'}</p>
            <Button onClick={() => router.push('/evidence')} variant="outline">
              Back to Evidence
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const chainOfCustody = evidence.chain_of_custody || []

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 cursor-pointer">
                  JCTC
                </h1>
              </Link>
              <span className="text-neutral-400">|</span>
              <Link href="/evidence">
                <span className="text-neutral-600 hover:text-neutral-900 cursor-pointer">Evidence</span>
              </Link>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-700">{evidence.item_number}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/evidence/${evidenceId}/edit`)}>
              Edit Evidence
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Evidence Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-neutral-900">{evidence.item_number}</h2>
                <Badge variant="default">{evidence.type}</Badge>
              </div>
              <p className="text-lg text-neutral-700">{evidence.description}</p>
            </div>
            {evidence.case_id && (
              <Button variant="primary" asChild>
                <Link href={`/cases/${evidence.case_id}`}>View Case</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Evidence Details */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Evidence Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Item Number</label>
                    <p className="text-neutral-900 mt-1 font-semibold">{evidence.item_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Type</label>
                    <p className="text-neutral-900 mt-1">{evidence.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Collection Date</label>
                    <p className="text-neutral-900 mt-1">
                      {new Date(evidence.collection_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Collected By</label>
                    <p className="text-neutral-900 mt-1">{evidence.collected_by}</p>
                  </div>
                  {evidence.storage_location && (
                    <div>
                      <label className="text-sm font-medium text-neutral-600">Storage Location</label>
                      <p className="text-neutral-900 mt-1">{evidence.storage_location}</p>
                    </div>
                  )}
                  {evidence.hash_value && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-neutral-600">Hash Value</label>
                      <p className="text-neutral-900 mt-1 font-mono text-sm break-all">{evidence.hash_value}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chain of Custody */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chain of Custody</CardTitle>
                  <Button variant="primary" size="sm">+ Add Entry</Button>
                </div>
              </CardHeader>
              <CardContent>
                {chainOfCustody.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-neutral-600 text-sm">No chain of custody entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {chainOfCustody.map((entry: any, index: number) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary-600' : 'bg-neutral-400'}`}></div>
                          {index < chainOfCustody.length - 1 && <div className="w-0.5 h-full bg-neutral-300 mt-2"></div>}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-neutral-900">{entry.action}</p>
                            <p className="text-xs text-neutral-500">{new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                          <p className="text-sm text-neutral-700 mb-1">
                            {entry.transferred_from ? `From: ${entry.transferred_from}` : ''}
                            {entry.transferred_from && entry.transferred_to && ' → '}
                            {entry.transferred_to ? `To: ${entry.transferred_to}` : ''}
                          </p>
                          {entry.purpose && <p className="text-sm text-neutral-600">Purpose: {entry.purpose}</p>}
                          {entry.notes && <p className="text-sm text-neutral-500 mt-1">{entry.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {evidence.notes && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-700 whitespace-pre-wrap">{evidence.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Evidence Info */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-600">Status</label>
                  <p className="mt-1">
                    <Badge variant={chainOfCustody.length > 0 ? 'success' : 'warning'}>
                      {chainOfCustody.length > 0 ? 'Chain Verified' : 'Pending'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600">Custody Transfers</label>
                  <p className="text-neutral-900 mt-1 text-2xl font-bold">{chainOfCustody.length}</p>
                </div>
                {evidence.case_id && (
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Related Case</label>
                    <p className="text-neutral-900 mt-1">
                      <Link href={`/cases/${evidence.case_id}`} className="text-primary-600 hover:underline">
                        View Case →
                      </Link>
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-neutral-600">Created</label>
                  <p className="text-neutral-900 mt-1">{new Date(evidence.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600">Last Updated</label>
                  <p className="text-neutral-900 mt-1">{new Date(evidence.updated_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="primary" className="w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Custody Entry
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Evidence
                </Button>
              </CardContent>
            </Card>

            {/* Files Attached */}
            {evidence.files && evidence.files.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Attached Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {evidence.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-neutral-900">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function EvidenceDetailPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <EvidenceDetailContent />
    </ProtectedRoute>
  )
}
