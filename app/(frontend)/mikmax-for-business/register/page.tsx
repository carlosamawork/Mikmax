import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import B2bRegisterForm from '@/components/B2B/B2bRegisterForm/B2bRegisterForm'

export const metadata: Metadata = {
  title: 'Create a business account',
  robots: {index: false, follow: false},
}

export default function B2bRegisterPage() {
  return (
    <AuthLayout>
      <B2bRegisterForm />
    </AuthLayout>
  )
}
