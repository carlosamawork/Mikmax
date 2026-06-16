import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import B2bRegisterForm from '@/components/B2B/B2bRegisterForm/B2bRegisterForm'
import {B2B_ENABLED} from '@/lib/b2b/flag'

export const metadata: Metadata = {
  title: 'Create a business account',
  robots: {index: false, follow: false},
}

export default function B2bRegisterPage() {
  if (!B2B_ENABLED) notFound()
  return (
    <AuthLayout>
      <B2bRegisterForm />
    </AuthLayout>
  )
}
