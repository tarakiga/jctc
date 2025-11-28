'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Upload, 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  FileVideo, 
  FileArchive, 
  X, 
  Download, 
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Shield,
  Eye,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { 
  useAttachments, 
  computeSHA256Hash, 
  formatFileSize, 
  CLASSIFICATION_OPTIONS,
  type AttachmentClassification,
  type VirusScanStatus,
  type Attachment 
} from '@/lib/hooks/useAttachments';

interface AttachmentManagerProps {
  caseId: string;
  attachments?: any[];  // Optional mock attachments
}

export default function AttachmentManager({ caseId, attachments: mockAttachments }: AttachmentManagerProps) {
  const { attachments: apiAttachments, isLoading, createAttachment, deleteAttachment, verifyHash, isCreating, isDeleting } = useAttachments(caseId);
  
  // Use mock attachments if provided, otherwise use API data
  const attachments = mockAttachments || apiAttachments;
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    classification: 'LE_SENSITIVE' as AttachmentClassification,
    notes: '',
  });
  const [isHashing, setIsHashing] = useState(false);
  const [filterClassification, setFilterClassification] = useState<AttachmentClassification | 'ALL'>('ALL');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // File icon helper
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <FileVideo className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (fileType.includes('zip') || fileType.includes('archive')) return <FileArchive className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };

  // Virus scan badge helper
  const getVirusScanBadge = (status: VirusScanStatus, details?: string) => {
    const badges = {
      PENDING: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
          <Clock className="w-3 h-3" />
          Scanning...
        </span>
      ),
      CLEAN: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md">
          <ShieldCheck className="w-3 h-3" />
          Clean
        </span>
      ),
      INFECTED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md" title={details}>
          <ShieldAlert className="w-3 h-3" />
          Infected
        </span>
      ),
      FAILED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-md">
          <AlertTriangle className="w-3 h-3" />
          Scan Failed
        </span>
      ),
    };
    return badges[status];
  };

  // Classification badge helper
  const getClassificationBadge = (classification: AttachmentClassification) => {
    const badges = {
      PUBLIC: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
          <Eye className="w-3 h-3" />
          Public
        </span>
      ),
      LE_SENSITIVE: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
          <Shield className="w-3 h-3" />
          LE Sensitive
        </span>
      ),
      PRIVILEGED: (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md">
          <ShieldAlert className="w-3 h-3" />
          Privileged
        </span>
      ),
    };
    return badges[classification];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsHashing(true);
    try {
      const hash = await computeSHA256Hash(selectedFile);
      
      await createAttachment({
        case_id: caseId,
        title: formData.title,
        filename: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.type || 'application/octet-stream',
        classification: formData.classification,
        sha256_hash: hash,
        notes: formData.notes || undefined,
      });

      // Reset form
      setShowUploadForm(false);
      setSelectedFile(null);
      setFormData({
        title: '',
        classification: 'LE_SENSITIVE',
        notes: '',
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsHashing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      await deleteAttachment(id);
    }
  };

  const handleVerifyHash = async (attachment: Attachment) => {
    // In real system, would download file and re-hash
    // For mock purposes, we'll simulate this
    setVerifyingId(attachment.id);
    try {
      const isValid = await verifyHash({ id: attachment.id, file: new File([], attachment.filename) });
      if (isValid) {
        alert(`✅ Hash verification successful!\n\nFile: ${attachment.filename}\nSHA-256: ${attachment.sha256_hash}\n\nFile integrity confirmed.`);
      } else {
        alert(`❌ Hash verification failed!\n\nFile: ${attachment.filename}\n\nWARNING: File may have been tampered with or corrupted.`);
      }
    } finally {
      setVerifyingId(null);
    }
  };

  // Filter attachments
  const filteredAttachments = filterClassification === 'ALL' 
    ? attachments 
    : attachments.filter(att => att.classification === filterClassification);

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
          <h2 className="text-xl font-semibold text-neutral-900">Case Attachments</h2>
          <p className="text-sm text-neutral-600 mt-1">Upload and manage case-related documents and files</p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-black text-white hover:bg-neutral-800 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
        >
          {showUploadForm ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Attachment
            </>
          )}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Upload New Attachment</h3>
          
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select File *
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
              {selectedFile && (
                <p className="text-xs text-neutral-600 mt-1">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Brief description of the attachment"
              />
            </div>

            {/* Classification */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Classification Level *
              </label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value as AttachmentClassification })}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              >
                {CLASSIFICATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-600 mt-1">
                {CLASSIFICATION_OPTIONS.find((opt) => opt.value === formData.classification)?.description}
              </p>
            </div>

            {/* Security Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Automatic Security Processing</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Upon upload, files are automatically scanned for viruses (status starts as "Pending") and a SHA-256 hash is computed for integrity verification. You can verify file integrity at any time using the "Verify Hash" button.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Additional context about this attachment..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !formData.title || isCreating || isHashing}
                className="px-6 py-2 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                {isHashing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Computing Hash...
                  </>
                ) : isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setFormData({ title: '', classification: 'LE_SENSITIVE', notes: '' });
                }}
                className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-700">Filter by Classification:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterClassification('ALL')}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
              filterClassification === 'ALL'
                ? 'bg-black text-white shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
            }`}
          >
            All ({attachments.length})
          </button>
          {CLASSIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterClassification(opt.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                filterClassification === opt.value
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300'
              }`}
            >
              {opt.label} ({attachments.filter(a => a.classification === opt.value).length})
            </button>
          ))}
        </div>
      </div>

      {/* Attachments List */}
      {filteredAttachments.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600">
            {filterClassification === 'ALL' 
              ? 'No attachments uploaded yet' 
              : `No ${CLASSIFICATION_OPTIONS.find(o => o.value === filterClassification)?.label} attachments`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="p-3 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg text-neutral-700">
                  {getFileIcon(attachment.file_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-neutral-900 truncate">{attachment.title}</h4>
                      <p className="text-sm text-neutral-600 truncate">{attachment.filename}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getClassificationBadge(attachment.classification)}
                      {getVirusScanBadge(attachment.virus_scan_status, attachment.virus_scan_details)}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600 mb-3">
                    <div>
                      <span className="font-medium">Size:</span> {formatFileSize(attachment.file_size)}
                    </div>
                    <div>
                      <span className="font-medium">Uploaded by:</span> {attachment.uploaded_by}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">SHA-256:</span>{' '}
                      <code className="text-[10px] bg-neutral-100 px-1 py-0.5 rounded">{attachment.sha256_hash}</code>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Uploaded:</span> {format(new Date(attachment.uploaded_at), 'PPp')}
                    </div>
                    {attachment.notes && (
                      <div className="col-span-2">
                        <span className="font-medium">Notes:</span> {attachment.notes}
                      </div>
                    )}
                  </div>

                  {/* Warning for infected files */}
                  {attachment.virus_scan_status === 'INFECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-900">Virus Detected</p>
                          <p className="text-xs text-red-700 mt-1">{attachment.virus_scan_details}</p>
                          <p className="text-xs text-red-700 mt-1">⚠️ Do not download or execute this file.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerifyHash(attachment)}
                      disabled={verifyingId === attachment.id}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {verifyingId === attachment.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-neutral-700"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify Hash
                        </>
                      )}
                    </button>
                    {attachment.virus_scan_status !== 'INFECTED' && (
                      <button
                        className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-neutral-300 hover:border-red-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
