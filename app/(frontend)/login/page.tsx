import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import LoginForm from '@/components/Account/LoginForm/LoginForm'

export const metadata: Metadata = {
  title: 'Log in',
  robots: {index: false, follow: false},
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
