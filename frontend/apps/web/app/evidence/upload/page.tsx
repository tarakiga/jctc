'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@jctc/ui'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { useEvidenceMutations } from '@/lib/hooks/useEvidence'

function EvidenceUploadContent() {
  const { logout } = useAuth()
  const router = useRouter()
  const { createEvidenceWithFiles, loading, error } = useEvidenceMutations()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    case_id: '',
    type: 'DIGITAL',
    description: '',
    collected_date: new Date().toISOString().split('T')[0],
    location_collected: '',
    collected_by: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const evidence = await createEvidenceWithFiles(
      {
        case_id: formData.case_id,
        type: formData.type,
        description: formData.description,
        collected_date: formData.collected_date,
        collected_by: formData.collected_by,
        location_collected: formData.location_collected || undefined,
      },
      selectedFiles
    )

    if (evidence) {
      // Success - redirect to evidence list
      router.push('/evidence')
    }
    // Error is automatically handled by the hook
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* File Upload Section */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Select Files *
                  </label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-neutral-600">
                        <p className="text-lg font-medium mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm">Support for multiple files</p>
                      </div>
                    </label>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-700">Selected Files:</p>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-neutral-100 p-3 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-neutral-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{file.name}</p>
                            <p className="text-xs text-neutral-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evidence Metadata */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Evidence Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="case_id"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Related Case *
                  </label>
                  <select
                    id="case_id"
                    name="case_id"
                    required
                    value={formData.case_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a case</option>
                    <option value="1">JCTC-2025-A7B3C - Business Email Compromise</option>
                    <option value="2">JCTC-2025-B8C4D - Corporate Data Breach</option>
                    <option value="3">JCTC-2025-C9D5E - Identity Theft Ring</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-2">
                    Evidence Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="DIGITAL">Digital</option>
                    <option value="PHYSICAL">Physical</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="TESTIMONIAL">Testimonial</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Detailed description of the evidence"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="collected_date"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Date Collected *
                    </label>
                    <input
                      type="date"
                      id="collected_date"
                      name="collected_date"
                      required
                      value={formData.collected_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="collected_by"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Collected By *
                    </label>
                    <input
                      type="text"
                      id="collected_by"
                      name="collected_by"
                      required
                      value={formData.collected_by}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Name of person who collected evidence"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location_collected"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Location Collected
                  </label>
                  <input
                    type="text"
                    id="location_collected"
                    name="location_collected"
                    value={formData.location_collected}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Location where evidence was collected"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">Error Uploading Evidence</p>
              <p className="text-red-600 text-sm mt-1">{error.message}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.push('/evidence')} disabled={loading}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-base bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 focus:ring-neutral-500"
            >
              {loading ? 'Uploading...' : 'Upload Evidence'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function EvidenceUploadPage() {
  return (
    <ProtectedRoute requireAuth requiredPermissions={['evidence:add']}>
      <EvidenceUploadContent />
    </ProtectedRoute>
  )
}
