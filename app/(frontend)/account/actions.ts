'use server'

import {redirect} from 'next/navigation'
import {
  customerAddressCreate,
  customerAddressUpdate,
  customerDefaultAddressUpdate,
  customerUpdate,
  logoutToken,
} from '@/lib/shopify'
import {setCustomerBirthday} from '@/lib/shopify-admin'
import {clearCustomerSession, getCustomerToken, setCustomerSession} from '@/lib/auth/session'
import {getCurrentCustomer} from '@/lib/auth/customer'
import type {AccountInfoInput, ActionResult, ShippingInput} from '@/types/account'

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
  redirect('/')
}
