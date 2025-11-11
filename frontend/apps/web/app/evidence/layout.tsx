import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'
import { ReactNode } from 'react'

export default function EvidenceLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
