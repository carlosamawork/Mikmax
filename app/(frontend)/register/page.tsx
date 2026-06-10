import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import RegisterForm from '@/components/Account/RegisterForm/RegisterForm'

export const metadata: Metadata = {
  title: 'Create account',
  robots: {index: false, follow: false},
}

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
