import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'
import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
