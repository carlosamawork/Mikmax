'use server'

import {customerCreate, login} from '@/lib/shopify'
import {setCustomerSession} from '@/lib/auth/session'
import type {AuthResult, RegisterInput} from '@/types/account'

// Traduce los errores de Shopify (customerUserErrors) a mensajes en español.
function translateError(err?: {code?: string; message?: string}): string {
  const code = err?.code
  const msg = (err?.message || '').toLowerCase()
  if (code === 'TAKEN' || msg.includes('taken')) return 'An account with this email already exists.'
  if (code === 'INVALID' || msg.includes('email')) return 'The email is not valid.'
  if (msg.includes('password')) return 'The password does not meet the minimum requirements.'
  return err?.message || 'Could not create the account. Please try again.'
}

export async function registerAction(input: RegisterInput): Promise<AuthResult> {
  const email = input.email?.trim()
  const {password} = input

  if (!email || !password) {
    return {ok: false, error: 'Email and password are required.'}
  }

  // 1. Crear el cliente en Shopify.
  const created = await customerCreate(email, password)
  if (created?.error) {
    return {ok: false, error: 'Could not create the account. Please try again.'}
  }
  const createErrors = created?.customerCreate?.customerUserErrors ?? []
  if (createErrors.length) {
    return {ok: false, error: translateError(createErrors[0])}
  }

  // 2. Auto-login para obtener el access token.
  const loginRes = await login(email, password)
  const token = loginRes?.customerAccessTokenCreate?.customerAccessToken
  if (!token?.accessToken) {
    return {
      ok: false,
      error: 'Account created, but we could not sign you in automatically. Please log in manually.',
    }
  }

  // 3. Guardar la sesión en cookie httpOnly.
  await setCustomerSession(token.accessToken, token.expiresAt)
  return {ok: true}
}
