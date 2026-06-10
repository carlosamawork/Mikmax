import {cookies} from 'next/headers'

// Token de cliente de Shopify (Storefront API). Cookie httpOnly: nunca accesible desde JS del cliente.
const COOKIE = 'mikmax_customer_token'

export async function setCustomerSession(accessToken: string, expiresAt?: string) {
  const store = await cookies()
  store.set(COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? {expires: new Date(expiresAt)} : {}),
  })
}

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE)?.value ?? null
}

export async function clearCustomerSession() {
  const store = await cookies()
  store.delete(COOKIE)
}
