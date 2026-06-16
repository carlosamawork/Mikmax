'use client'

import {FormEvent, useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import AuthField from '@/components/Account/AuthField/AuthField'
import {loginAction} from '@/app/(frontend)/login/actions'
import s from './B2bLogin.module.scss'

export default function B2bLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    const res = await loginAction({email, password})
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    router.push('/mikmax-for-business/area')
    router.refresh()
  }

  return (
    <form className={s.login} onSubmit={onSubmit} noValidate>
      <p className={s.heading}>Create a business account</p>
      <div className={s.fields}>
        <AuthField
          name="b2b-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          name="b2b-password"
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
        {loading ? '…' : 'Sign in'}
      </button>
      <Link href="/login/forgot" className={s.forgot}>
        Forgot password?
      </Link>
      <p className={s.alt}>
        New to Mikmax?{' '}
        <Link href="/mikmax-for-business/register" className={s.altLink}>
          Sign up here
        </Link>
      </p>
    </form>
  )
}
