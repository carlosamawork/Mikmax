import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import ResetForm from '@/components/Account/ResetForm/ResetForm'
import {B2B_ENABLED} from '@/lib/b2b/flag'

export const metadata: Metadata = {
  title: 'Crear contraseña — Mikmax for Business',
  robots: {index: false, follow: false},
}

export default async function B2bActivatePage({
  params,
}: {
  params: Promise<{id: string; token: string}>
}) {
  if (!B2B_ENABLED) notFound()
  const {id, token} = await params
  return (
    <AuthLayout>
      <ResetForm id={id} token={token} />
    </AuthLayout>
  )
}
