import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getB2bCompanyInfo} from '@/lib/b2b/application'
import AccountInfoForm from '@/components/Account/AccountInfoForm/AccountInfoForm'
import CompanyInfo from '@/components/Account/CompanyInfo/CompanyInfo'
import ShippingForm from '@/components/Account/ShippingForm/ShippingForm'

export const metadata: Metadata = {
  title: 'My account',
  robots: {index: false, follow: false},
}

export default async function AccountPage() {
  const session = await getCurrentCustomer()
  if (!session) return null

  // Solo para clientes B2B aprobados: datos de empresa desde su b2bApplication.
  const isB2b = session.customer.b2bValidated?.value === 'true'
  const company = isB2b ? await getB2bCompanyInfo(session.customer.id) : null

  return (
    <>
      <AccountInfoForm customer={session.customer} />
      {company && <CompanyInfo company={company} />}
      <ShippingForm customer={session.customer} />
    </>
  )
}
