'use server'

import {
  customerAddressCreate,
  customerAddressUpdate,
  customerDefaultAddressUpdate,
  customerUpdate,
  logoutToken,
} from '@/lib/shopify'
// @ts-ignore — lib/shopify-admin.js no tiene tipos
import {
  setCustomerBirthday,
  getReturnableItems,
  createReturnRequest,
  getOrdersReturnStatus,
} from '@/lib/shopify-admin'
import {clearCustomerSession, getCustomerToken, setCustomerSession} from '@/lib/auth/session'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {adminOrderGid, isReturnEligible, validateSelections} from '@/lib/account/returns'
import {returnRequestInternalEmail} from '@/lib/account/returnEmail'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import type {AccountInfoInput, ActionResult, ShippingInput} from '@/types/account'

type ReturnableItem = {fulfillmentLineItemId: string; title: string; maxQuantity: number}

// 'DD/MM/AAAA' → 'YYYY-MM-DD' (o null si no es válida).
function toIsoDate(value: string): string | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

export async function updateAccountInfo(input: AccountInfoInput): Promise<ActionResult> {
  const token = await getCustomerToken()
  const session = await getCurrentCustomer()
  if (!token || !session) return {ok: false, error: 'Session expired. Please log in again.'}

  // Nombre y apellidos → Storefront API.
  const res = await customerUpdate(token, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
  })
  if (res?.error) return {ok: false, error: 'Could not save. Please try again.'}
  const errs = res?.customerUpdate?.customerUserErrors ?? []
  if (errs.length) return {ok: false, error: errs[0].message}

  // customerUpdate puede rotar el token (al cambiar email/pass); si llega uno nuevo, refrescamos cookie.
  const newToken = res?.customerUpdate?.customerAccessToken
  if (newToken?.accessToken) await setCustomerSession(newToken.accessToken, newToken.expiresAt)

  // Fecha de nacimiento → metafield vía Admin API.
  if (input.birthday?.trim()) {
    const iso = toIsoDate(input.birthday)
    if (!iso) return {ok: false, error: 'Invalid date of birth (use DD/MM/YYYY).'}
    const bday = await setCustomerBirthday(session.customer.id, iso)
    if ((bday as {error?: string})?.error) {
      return {ok: false, error: (bday as {error: string}).error}
    }
  }

  return {ok: true}
}

export async function updateShipping(input: ShippingInput): Promise<ActionResult> {
  const token = await getCustomerToken()
  const session = await getCurrentCustomer()
  if (!token || !session) return {ok: false, error: 'Session expired. Please log in again.'}

  const phoneE164 = `${input.phoneCountry}${input.phone.replace(/\s+/g, '')}`.trim()
  // Nombre/apellido de la cuenta en la dirección → el checkout los precarga.
  const address = {
    firstName: session.customer.firstName || undefined,
    lastName: session.customer.lastName || undefined,
    address1: input.address1.trim(),
    city: input.city.trim(),
    province: input.province.trim() || undefined,
    zip: input.zip.trim(),
    country: input.country,
    phone: phoneE164 || undefined,
  }

  const existingId = session.customer.defaultAddress?.id
  if (existingId) {
    const res = await customerAddressUpdate(token, existingId, address)
    const errs = res?.customerAddressUpdate?.customerUserErrors ?? []
    if (res?.error || errs.length) {
      return {ok: false, error: errs[0]?.message || 'Could not save the address.'}
    }
  } else {
    const res = await customerAddressCreate(token, address)
    const errs = res?.customerAddressCreate?.customerUserErrors ?? []
    const newId = res?.customerAddressCreate?.customerAddress?.id
    if (res?.error || errs.length || !newId) {
      return {ok: false, error: errs[0]?.message || 'Could not create the address.'}
    }
    await customerDefaultAddressUpdate(token, newId)
  }

  return {ok: true}
}

export async function logout(): Promise<void> {
  const token = await getCustomerToken()
  if (token) await logoutToken(token)
  await clearCustomerSession()
}

export async function getReturnableItemsAction(
  orderId: string,
): Promise<{items?: ReturnableItem[]; error?: string}> {
  const session = await getCurrentCustomer()
  if (!session) return {error: 'No session'}
  const owned = (session.customer.orders?.edges ?? []).some(({node}) => node.id === orderId)
  if (!owned) return {error: 'Order not found'}
  const gid = adminOrderGid(orderId)
  if (!gid) return {error: 'Order not found'}
  const result = await getReturnableItems(gid)
  if (result.error) console.error('[returns] getReturnableItems:', result.error)
  return result
}

export async function requestOrderReturn(
  orderId: string,
  selections: unknown,
  note: string,
): Promise<{ok?: boolean; error?: string}> {
  const session = await getCurrentCustomer()
  if (!session) return {error: 'No session'}
  const order = (session.customer.orders?.edges ?? []).find(({node}) => node.id === orderId)?.node
  if (!order) return {error: 'Order not found'}
  const gid = adminOrderGid(orderId)
  if (!gid) return {error: 'Order not found'}

  const statuses = (await getOrdersReturnStatus([gid])) as Record<string, string | null>
  const eligible = isReturnEligible({
    processedAt: order.processedAt || '',
    financialStatus: order.financialStatus ?? null,
    returnStatus: statuses[gid] ?? null,
  })
  if (!eligible) return {error: 'Order not eligible for return'}

  const returnable = await getReturnableItems(gid)
  if (returnable.error || !returnable.items) return {error: returnable.error ?? 'Unavailable'}
  const valid = validateSelections(selections, returnable.items)
  if (!valid) return {error: 'Invalid selection'}

  const cleanNote = String(note ?? '').slice(0, 500)
  const result = await createReturnRequest({
    orderGid: gid,
    lineItems: valid.map((v) => ({...v, ...(cleanNote ? {customerNote: cleanNote} : {})})),
  })
  if (result.error) {
    console.error('[returns] createReturnRequest:', result.error)
    return {error: result.error}
  }

  const titleById = new Map(
    returnable.items.map((i: ReturnableItem) => [i.fulfillmentLineItemId, i.title]),
  )
  const mail = returnRequestInternalEmail({
    orderNumber: order.name || String(order.orderNumber ?? ''),
    customerEmail: session.customer.email ?? '',
    lines: valid.map((v) => ({
      title: titleById.get(v.fulfillmentLineItemId) ?? '',
      quantity: v.quantity,
      reason: v.returnReason,
    })),
    note: cleanNote || undefined,
  })
  const r = await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...mail})
  if (r?.error) console.error('[returns] internal email failed:', r.error)
  return {ok: true}
}
