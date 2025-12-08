'use client'

import { useState } from 'react'
import { useForensicReports, useForensicReportMutations } from '@/lib/hooks/useForensicReports'
import { useDevices } from '@/lib/hooks/useDevices'
import { FileText, Upload, Plus, X, Trash2, Download, CheckCircle, XCircle, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { useLookup, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

interface ReportUploaderProps {
  caseId: string
}

type ReportType = 'EXTRACTION' | 'ANALYSIS' | 'VALIDATION' | 'SUMMARY' | 'OTHER'

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  EXTRACTION: 'Extraction Report',
  ANALYSIS: 'Analysis Report',
  VALIDATION: 'Validation Report',
  SUMMARY: 'Summary Report',
  OTHER: 'Other'
}

const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  EXTRACTION: 'from-blue-50 to-cyan-50',
  ANALYSIS: 'from-purple-50 to-violet-50',
  VALIDATION: 'from-green-50 to-emerald-50',
  SUMMARY: 'from-orange-50 to-amber-50',
  OTHER: 'from-gray-50 to-neutral-50'
}

export default function ReportUploader({ caseId }: ReportUploaderProps) {
  const { data: reports = [], isLoading } = useForensicReports(caseId)
  const { data: devices = [] } = useDevices(caseId)
  const { uploadReport, deleteReport, validateTool, loading, validationResult } = useForensicReportMutations(caseId)

  // Fetch report_type lookup values
  const reportTypeLookup = useLookup(LOOKUP_CATEGORIES.REPORT_TYPE)

  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showValidationForm, setShowValidationForm] = useState(false)

  // Upload form state
  const [formData, setFormData] = useState({
    report_type: 'EXTRACTION' as ReportType,
    tool_name: '',
    tool_version: '',
    tool_binary_hash: '',
    device_id: '',
    file: null as File | null,
    generated_at: new Date().toISOString().slice(0, 16),
    notes: ''
  })

  // Validation form state
  const [validationData, setValidationData] = useState({
    tool_name: '',
    tool_version: '',
    binary_file: null as File | null
  })

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.file) {
      alert('Please select a report file')
      return
    }

    try {
      await uploadReport({
        report_type: formData.report_type,
        tool_name: formData.tool_name,
        tool_version: formData.tool_version,
        tool_binary_hash: formData.tool_binary_hash || undefined,
        device_id: formData.device_id || undefined,
        file: formData.file,
        generated_at: formData.generated_at,
        notes: formData.notes || undefined
      })

      resetUploadForm()
      alert('Report uploaded successfully')
    } catch (error) {
      console.error('Failed to upload report:', error)
      alert('Failed to upload report. This feature will be enabled when the backend API is ready.')
    }
  }

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validationData.binary_file) {
      alert('Please select a tool binary file')
      return
    }

    try {
      const result = await validateTool(
        validationData.tool_name,
        validationData.tool_version,
        validationData.binary_file
      )

      // Auto-populate hash in upload form if validation succeeds
      if (result.valid) {
        setFormData(prev => ({
          ...prev,
          tool_name: validationData.tool_name,
          tool_version: validationData.tool_version,
          tool_binary_hash: result.hash
        }))
        setShowValidationForm(false)
      }
    } catch (error) {
      console.error('Failed to validate tool:', error)
      alert('Failed to validate tool binary')
    }
  }

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      await deleteReport(reportId)
    } catch (error) {
      console.error('Failed to delete report:', error)
      alert('Failed to delete report. This feature will be enabled when the backend API is ready.')
    }
  }

  const resetUploadForm = () => {
    setFormData({
      report_type: 'EXTRACTION',
      tool_name: '',
      tool_version: '',
      tool_binary_hash: '',
      device_id: '',
      file: null,
      generated_at: new Date().toISOString().slice(0, 16),
      notes: ''
    })
    setShowUploadForm(false)
  }

  const resetValidationForm = () => {
    setValidationData({
      tool_name: '',
      tool_version: '',
      binary_file: null
    })
    setShowValidationForm(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Loading reports...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Forensic Reports</h2>
            <p className="text-sm text-neutral-600">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowValidationForm(!showValidationForm)}
            className="px-4 py-2 bg-white hover:bg-green-50 text-green-700 border border-green-300 rounded-lg shadow-sm hover:shadow font-medium transition-all active:scale-95 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Validate Tool
          </button>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 font-medium"
          >
            {showUploadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showUploadForm ? 'Cancel' : 'Upload Report'}
          </button>
        </div>
      </div>

      {/* Tool Validation Form */}
      {showValidationForm && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-700" />
            <h3 className="text-lg font-bold text-green-900">Validate Forensic Tool</h3>
          </div>
          <p className="text-sm text-green-800 mb-4">
            Upload the forensic tool binary to compute and validate its SHA-256 hash. This ensures tool integrity.
          </p>
          <form onSubmit={handleValidate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tool Name *
                </label>
                <input
                  type="text"
                  value={validationData.tool_name}
                  onChange={(e) => setValidationData(prev => ({ ...prev, tool_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., FTK Imager"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tool Version *
                </label>
                <input
                  type="text"
                  value={validationData.tool_version}
                  onChange={(e) => setValidationData(prev => ({ ...prev, tool_version: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 4.7.1.2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tool Binary File *
              </label>
              <input
                type="file"
                onChange={(e) => setValidationData(prev => ({ ...prev, binary_file: e.target.files?.[0] || null }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:cursor-pointer cursor-pointer"
                required
              />
            </div>

            {validationResult && (
              <div className={`p-4 rounded-lg border-2 ${validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validationResult.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                    {validationResult.valid ? 'Tool Validated Successfully' : 'Validation Failed'}
                  </span>
                </div>
                <p className="text-xs font-mono break-all text-neutral-700">
                  SHA-256: {validationResult.hash}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-green-700 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Validate Tool'}
              </button>
              <button
                type="button"
                onClick={resetValidationForm}
                className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Upload Forensic Report</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Report Type *
                </label>
                <select
                  value={formData.report_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, report_type: e.target.value as ReportType }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tool Name *
                </label>
                <input
                  type="text"
                  value={formData.tool_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, tool_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., FTK Imager"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tool Version *
                </label>
                <input
                  type="text"
                  value={formData.tool_version}
                  onChange={(e) => setFormData(prev => ({ ...prev, tool_version: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 4.7.1.2"
                  required
                />
              </div>

              <div>
                <DateTimePicker
                  label="Report Generated Date & Time"
                  value={formData.generated_at}
                  onChange={(value) => setFormData(prev => ({ ...prev, generated_at: value }))}
                  required
                  placeholder="Select report generated date and time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tool Binary Hash (Optional)
                </label>
                <input
                  type="text"
                  value={formData.tool_binary_hash}
                  onChange={(e) => setFormData(prev => ({ ...prev, tool_binary_hash: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  placeholder="SHA-256 hash (use Validate Tool button)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Report File * (will be hashed with SHA-256)
              </label>
              <input
                type="file"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Additional notes about this report..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg shadow-sm hover:shadow-md hover:bg-neutral-800 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Upload Report'}
              </button>
              <button
                type="button"
                onClick={resetUploadForm}
                className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No reports uploaded</p>
          <p className="text-sm text-neutral-500">Upload your first forensic report to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div
              key={report.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${REPORT_TYPE_COLORS[report.report_type]} flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-6 h-6 text-neutral-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        {REPORT_TYPE_LABELS[report.report_type]}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {report.tool_name} v{report.tool_version}
                      </span>
                      {report.device_label && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {report.device_label}
                        </span>
                      )}
                      {report.tool_binary_hash && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Shield className="w-3 h-3" />
                          Validated
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-600 space-y-1">
                      <p className="font-mono">📎 {report.file_name} ({formatFileSize(report.file_size)})</p>
                      <p className="font-mono break-all">🔒 Report SHA-256: {report.file_hash}</p>
                      {report.tool_binary_hash && (
                        <p className="font-mono break-all text-green-700">🛡️ Tool SHA-256: {report.tool_binary_hash}</p>
                      )}
                      <p>📅 Generated: {format(new Date(report.generated_at), 'PPp')}</p>
                      <p>👤 Generated by: {report.generated_by_name}</p>
                    </div>
                    {report.notes && (
                      <div className="mt-2 p-2 bg-neutral-50 rounded text-xs text-neutral-700">
                        <strong>Notes:</strong> {report.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => alert('Download functionality will be implemented with backend API')}
                    className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                    title="Download report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                    title="Delete report"
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
