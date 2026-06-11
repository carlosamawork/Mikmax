'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {FormEvent, useState} from 'react'
import AuthField from '@/components/Account/AuthField/AuthField'
import {registerAction} from '@/app/(frontend)/register/actions'
import s from '../authForm.module.scss'

export default function RegisterForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const res = await registerAction({email, password})
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    // Cuenta creada + auto-login (cookie httpOnly) → directo a la cuenta.
    router.push('/account')
    router.refresh()
  }

  return (
    <>
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <p className={s.heading}>Create account</p>

        <div className={s.fields}>
          <AuthField
            name="email"
            type="email"
            placeholder="Enter your mail"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <AuthField
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
          />
          <AuthField
            name="confirm"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={s.submit} disabled={loading}>
          {loading ? '…' : 'Continue'}
        </button>

        <div className={s.terms}>
          <p>By signing up, I have read an agree to</p>
          <p>
            <Link href="/legal/terms" className={s.termsLink}>
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy-policy" className={s.termsLink}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>

      <p className={s.altBottom}>
        Already have a Mikmax account?{' '}
        <Link href="/login" className={s.altLink}>
          Sign in
        </Link>
      </p>
    </>
  )
}
