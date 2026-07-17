import 'server-only'
import {customerCreate} from '@/lib/shopify'
// @ts-ignore — lib/shopify-admin.js no tiene tipos
import {
  customerTagsAdd,
  setCustomerB2bData,
  adminCustomerCreate,
  findCustomerIdByEmail,
} from '@/lib/shopify-admin'
// Aplica el rol B2B a un customer existente: tag + metafield de validacion.
async function applyB2bRole(customerId: string) {
  await customerTagsAdd(customerId, ['b2b-approved'])
  await setCustomerB2bData(customerId)
}

// Flujo AUTO-APPROVED. Si el email ya es cliente (caso común: ya tenía cuenta B2C),
// lo PROMOCIONA en vez de fallar; si no, lo crea con la contraseña elegida (Storefront).
// `existed` indica si reutilizó un cliente existente (no se le aplica la contraseña).
export async function createApprovedB2bCustomer(args: {
  email: string
  password: string
  companyName: string
}): Promise<{customerId?: string; existed?: boolean; error?: string}> {
  const found = await findCustomerIdByEmail(args.email)
  if (found?.error) return {error: found.error}

  let customerId: string | undefined = found?.id ?? undefined
  const existed = Boolean(customerId)

  if (!customerId) {
    const created = await customerCreate(args.email, args.password, {firstName: args.companyName})
    if (created?.error) return {error: 'shopify_create_failed'}
    const errs = created?.customerCreate?.customerUserErrors ?? []
    if (errs.length) return {error: errs[0].message}
    customerId = created?.customerCreate?.customer?.id
    if (!customerId) return {error: 'no_customer_id'}
  }

  await applyB2bRole(customerId)
  return {customerId, existed}
}

// Flujo REVIEW→APROBADO. Igual que el anterior pero sin contraseña: si el email no existe,
// crea el customer por Admin (sin password) y la route dispara el email de activación.
export async function createReviewedB2bCustomer(args: {
  email: string
  companyName: string
}): Promise<{customerId?: string; existed?: boolean; error?: string}> {
  const found = await findCustomerIdByEmail(args.email)
  if (found?.error) return {error: found.error}

  let customerId: string | undefined = found?.id ?? undefined
  const existed = Boolean(customerId)

  if (!customerId) {
    const created = await adminCustomerCreate({email: args.email, firstName: args.companyName})
    if (created?.error) return {error: created.error}
    customerId = created?.id
    if (!customerId) return {error: 'no_customer_id'}
  }

  await applyB2bRole(customerId)
  return {customerId, existed}
}
