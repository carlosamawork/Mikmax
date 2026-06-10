import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import AccountInfoForm from '@/components/Account/AccountInfoForm/AccountInfoForm'
import ShippingForm from '@/components/Account/ShippingForm/ShippingForm'

export const metadata: Metadata = {
  title: 'My account',
  robots: {index: false, follow: false},
}

export default async function AccountPage() {
  const session = await getCurrentCustomer()
  if (!session) return null

  return (
    <>
      <AccountInfoForm customer={session.customer} />
      <ShippingForm customer={session.customer} />
    </>
  )
}
