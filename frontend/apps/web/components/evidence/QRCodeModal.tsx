'use client'

import { Button } from '@jctc/ui'
import { useEffect, useRef } from 'react'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  evidenceNumber: string
  evidenceLabel: string
  evidenceId: string
}

export function QRCodeModal({ isOpen, onClose, evidenceNumber, evidenceLabel, evidenceId }: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  // Generate QR code URL using QR Server API
  const qrData = JSON.stringify({
    id: evidenceId,
    number: evidenceNumber,
    label: evidenceLabel,
    timestamp: new Date().toISOString()
  })
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Evidence QR Code - ${evidenceNumber}</title>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(to bottom right, #f8fafc, #e0e7ff);
              }
              .qr-container {
                text-align: center;
                background: white;
                padding: 3rem;
                border-radius: 1.5rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
              }
              img {
                width: 300px;
                height: 300px;
                border: 4px solid #3b82f6;
                border-radius: 1rem;
                margin: 1.5rem 0;
              }
              h2 {
                color: #1e293b;
                margin-bottom: 0.5rem;
                font-size: 1.5rem;
              }
              p {
                color: #64748b;
                margin: 0.5rem 0;
              }
              .evidence-number {
                color: #3b82f6;
                font-weight: 700;
                font-size: 1.25rem;
                margin: 1rem 0;
              }
              .evidence-label {
                color: #1e293b;
                font-weight: 600;
                font-size: 1.1rem;
              }
              @media print {
                body { background: white; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>Evidence QR Code</h2>
              <p class="evidence-number">${evidenceNumber}</p>
              <img src="${qrCodeUrl}" alt="Evidence QR Code" />
              <p class="evidence-label">${evidenceLabel}</p>
              <p style="font-size: 0.875rem; color: #94a3b8; margin-top: 1rem;">
                Generated: ${new Date().toLocaleString()}
              </p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container - Centered with Scroll Capability */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto flex flex-col max-h-[90vh]">

          {/* Scrollable Content Area */}
          <div ref={printRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center transform hover:scale-105 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Evidence Label</h2>
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium uppercase tracking-wider">
                  Scan to Verify
                </span>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6 flex flex-col items-center">
                <img
                  src={qrCodeUrl}
                  alt="Evidence QR Code"
                  className="w-48 h-48 mix-blend-multiply"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="%23f1f5f9" width="300" height="300"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="%2364748b" text-anchor="middle" dy=".3em">QR Code Unavailable</text></svg>'
                  }}
                />
                <div className="mt-4 text-center">
                  <p className="text-lg font-bold text-slate-900 font-mono tracking-tight">{evidenceNumber}</p>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] mx-auto mt-0.5">{evidenceLabel}</p>
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase">System ID</span>
                <span className="text-xs font-mono text-slate-700 select-all">{evidenceId.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase">Generated</span>
                <span className="text-xs font-medium text-slate-700">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white hover:bg-slate-50 hover:text-slate-900"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Label
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
