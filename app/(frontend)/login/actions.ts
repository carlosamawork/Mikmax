'use server'

import {customerRecover, login, resetPassword} from '@/lib/shopify'
import {setCustomerSession} from '@/lib/auth/session'
import type {AuthResult, RegisterInput} from '@/types/account'

export async function loginAction(input: RegisterInput): Promise<AuthResult> {
  const email = input.email?.trim()
  const {password} = input

  if (!email || !password) {
    return {ok: false, error: 'Email and password are required.'}
  }

  const res = await login(email, password)
  if (res?.error) {
    return {ok: false, error: 'Could not sign in. Please try again.'}
  }

  const token = res?.customerAccessTokenCreate?.customerAccessToken
  if (!token?.accessToken) {
    // Shopify devuelve token null en credenciales inválidas; mensaje genérico por seguridad.
    return {ok: false, error: 'Incorrect email or password.'}
  }

  await setCustomerSession(token.accessToken, token.expiresAt)
  return {ok: true}
}

export async function recoverAction(email: string): Promise<AuthResult> {
  const trimmed = email?.trim()
  if (!trimmed) return {ok: false, error: 'Enter your email.'}
  // Por seguridad no revelamos si el email existe: cualquier resultado se trata como éxito.
  await customerRecover(trimmed)
  return {ok: true}
}

export async function resetAction(input: {
  id: string
  token: string
  password: string
}): Promise<AuthResult> {
  if (input.password.length < 8) {
    return {ok: false, error: 'Password must be at least 8 characters.'}
  }
  const res = await resetPassword(input.id, input.token, input.password)
  if (!res.success) {
    const msg = typeof res.message === 'string' ? res.message : 'Could not reset the password.'
    return {ok: false, error: msg}
  }
  if (res.token?.accessToken) {
    await setCustomerSession(res.token.accessToken, res.token.expiresAt)
  }
  return {ok: true}
}
