'use client'

import { Button } from '@jctc/ui'

interface DeleteCustodyModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    itemAction: string
    itemDate: string
}

export function DeleteCustodyModal({ isOpen, onClose, onConfirm, itemAction, itemDate }: DeleteCustodyModalProps) {
    if (!isOpen) return null

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-center pt-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>

                    <div className="px-8 pt-6 pb-8">
                        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                            Delete Custody Entry?
                        </h2>
                        <p className="text-slate-600 text-center mb-6">
                            Are you sure you want to delete this <span className="font-semibold text-slate-900">{itemAction}</span> record from <span className="font-semibold text-slate-900">{itemDate}</span>?
                        </p>

                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-red-900 mb-1">This action is irreversible</p>
                                    <p className="text-xs text-red-700">
                                        Deleting this entry will create a gap in the chain of custody audit trail. This cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    onConfirm()
                                    onClose()
                                }}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Entry
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
