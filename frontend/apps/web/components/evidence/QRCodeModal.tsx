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
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div ref={printRef} className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Evidence QR Code</h2>
              <p className="text-lg font-semibold text-blue-600 mb-1">{evidenceNumber}</p>
              <p className="text-sm text-slate-600">{evidenceLabel}</p>
            </div>

            {/* QR Code */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 mb-6">
              <div className="bg-white rounded-xl p-4 border-4 border-blue-500 mx-auto w-fit">
                <img 
                  src={qrCodeUrl} 
                  alt="Evidence QR Code" 
                  className="w-64 h-64"
                  onError={(e) => {
                    // Fallback if QR service fails
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="%23f1f5f9" width="300" height="300"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="%2364748b" text-anchor="middle" dy=".3em">QR Code Unavailable</text></svg>'
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-600">
              <div className="flex justify-between mb-2">
                <span>Evidence ID:</span>
                <span className="font-mono text-slate-900">{evidenceId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Generated:</span>
                <span className="font-medium text-slate-900">{new Date().toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={handlePrint}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Label
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
