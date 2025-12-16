'use client'

import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'
import { ReactNode } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      // Only ADMIN and SUPER_ADMIN can access admin pages
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard')
      }
    }
  }, [user, isLoading, router])

  // Show nothing while checking permissions
  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  // Redirect unauthorized users (handled by useEffect)
  if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return null
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
