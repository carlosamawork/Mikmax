import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import ForgotForm from '@/components/Account/ForgotForm/ForgotForm'

export const metadata: Metadata = {
  title: 'Reset password',
  robots: {index: false, follow: false},
}

export default function ForgotPage() {
  return (
    <AuthLayout>
      <ForgotForm />
    </AuthLayout>
  )
}
