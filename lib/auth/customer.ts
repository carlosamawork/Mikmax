import {cache} from 'react'
import {getUser} from '@/lib/shopify'
import {getCustomerToken} from './session'
import type {Customer} from '@/types/account'

// Cliente actual a partir de la cookie de sesión. cache() dedup la llamada por request
// (layout + page la usan sin duplicar el fetch a Shopify).
export const getCurrentCustomer = cache(
  async (): Promise<{token: string; customer: Customer} | null> => {
    const token = await getCustomerToken()
    if (!token) return null
    const res = await getUser(token)
    const customer = (res as {customer?: Customer})?.customer ?? null
    if (!customer) return null
    return {token, customer}
  },
)
