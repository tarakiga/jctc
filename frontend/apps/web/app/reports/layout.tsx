import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'
import { ReactNode } from 'react'

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
