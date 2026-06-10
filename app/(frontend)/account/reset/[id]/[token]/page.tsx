import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import ResetForm from '@/components/Account/ResetForm/ResetForm'

export const metadata: Metadata = {
  title: 'Reset password',
  robots: {index: false, follow: false},
}

export default async function ResetPage({
  params,
}: {
  params: Promise<{id: string; token: string}>
}) {
  const {id, token} = await params
  return (
    <AuthLayout>
      <ResetForm id={id} token={token} />
    </AuthLayout>
  )
}
