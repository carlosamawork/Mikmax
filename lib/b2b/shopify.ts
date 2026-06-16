import 'server-only'
import {customerCreate} from '@/lib/shopify'
// @ts-ignore — lib/shopify-admin.js no tiene tipos
import {customerTagsAdd, setCustomerB2bData, adminCustomerCreate} from '@/lib/shopify-admin'
import type {B2bClientType} from '@/types/b2b'

const discountGroupFor = (t: B2bClientType) => (t === 'reseller' ? 'wholesale' : 'designer')

// Flujo AUTO-APPROVED: crea el customer con la contraseña elegida (Storefront) y le
// añade tags + metafields b2b (Admin). Devuelve {customerId} o {error}.
export async function createApprovedB2bCustomer(args: {
  email: string
  password: string
  companyName: string
  clientType: B2bClientType
}): Promise<{customerId?: string; error?: string}> {
  const created = await customerCreate(args.email, args.password, {firstName: args.companyName})
  if (created?.error) return {error: 'shopify_create_failed'}
  const errs = created?.customerCreate?.customerUserErrors ?? []
  if (errs.length) return {error: errs[0].message}
  const customerId: string | undefined = created?.customerCreate?.customer?.id
  if (!customerId) return {error: 'no_customer_id'}

  await customerTagsAdd(customerId, ['b2b-approved', args.clientType])
  await setCustomerB2bData(customerId, {
    clientType: args.clientType,
    discountGroup: discountGroupFor(args.clientType),
  })
  return {customerId}
}

// Flujo REVIEW→APROBADO: crea el customer sin contraseña (Admin) + tags + metafields.
// El email de activación lo dispara la route admin con el flujo recover existente.
export async function createReviewedB2bCustomer(args: {
  email: string
  companyName: string
  clientType: B2bClientType
}): Promise<{customerId?: string; error?: string}> {
  const created = await adminCustomerCreate({email: args.email, firstName: args.companyName})
  if (created?.error) return {error: created.error}
  const customerId: string | undefined = created?.id
  if (!customerId) return {error: 'no_customer_id'}

  await customerTagsAdd(customerId, ['b2b-approved', args.clientType])
  await setCustomerB2bData(customerId, {
    clientType: args.clientType,
    discountGroup: discountGroupFor(args.clientType),
  })
  return {customerId}
}
