'use client'

import { Button } from '@jctc/ui'

interface HashVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  isValid: boolean
  evidenceName: string
  hash?: string
}

export function HashVerificationModal({ isOpen, onClose, isValid, evidenceName, hash }: HashVerificationModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
          {/* Icon */}
          <div className="flex justify-center pt-8">
            {isValid ? (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center animate-in zoom-in duration-300">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center animate-in zoom-in duration-300">
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-8 pt-6 pb-8">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              {isValid ? 'Hash Verification Successful' : 'Hash Verification Failed'}
            </h2>
            <p className="text-slate-600 text-center mb-6">
              Evidence: <span className="font-semibold text-slate-900">"{evidenceName}"</span>
            </p>

            {/* Status Banner */}
            <div className={`border rounded-xl p-5 mb-6 ${
              isValid 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isValid ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="flex-1">
                  {isValid ? (
                    <>
                      <p className="text-sm font-semibold text-green-900 mb-1">File Integrity Confirmed</p>
                      <p className="text-xs text-green-700 mb-3">
                        The SHA-256 hash matches the original. This evidence has not been tampered with or corrupted.
                      </p>
                      {hash && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs font-medium text-green-800 mb-1">Verified Hash:</p>
                          <code className="text-xs text-green-700 break-all font-mono bg-white/50 px-2 py-1 rounded">
                            {hash}
                          </code>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-red-900 mb-1">Integrity Check Failed</p>
                      <p className="text-xs text-red-700 mb-2">
                        The current file hash does not match the stored hash. This evidence may have been:
                      </p>
                      <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                        <li>Modified or corrupted</li>
                        <li>Tampered with</li>
                        <li>Replaced with a different file</li>
                      </ul>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs font-semibold text-red-900">
                          ⚠️ Immediate action required: Document this incident and notify the case lead investigator.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Verification Time:</span>
                <span className="font-medium text-slate-900">
                  {new Date().toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Algorithm:</span>
                <span className="font-medium text-slate-900 font-mono">SHA-256</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Status:</span>
                <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {isValid ? '✓ Verified' : '✗ Failed'}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={onClose}
              className={`w-full ${
                isValid
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                  : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
              }`}
            >
              {isValid ? 'Close' : 'Acknowledge & Close'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
