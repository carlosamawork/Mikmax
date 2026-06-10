'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {FormEvent, useState} from 'react'
import AuthField from '@/components/Account/AuthField/AuthField'
import {loginAction} from '@/app/(frontend)/login/actions'
import s from '../authForm.module.scss'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    const res = await loginAction({email, password})
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    router.push('/account')
    router.refresh()
  }

  return (
    <>
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <p className={s.heading}>Please log in here</p>

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
            autoComplete="current-password"
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

        <Link href="/login/forgot" className={s.forgot}>
          Forgot your password?
        </Link>

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
        New to Mikmax?{' '}
        <Link href="/register" className={s.altLink}>
          Sign Up
        </Link>
      </p>
    </>
  )
}
