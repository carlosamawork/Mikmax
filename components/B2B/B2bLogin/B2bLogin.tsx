'use client'

import {FormEvent, useContext, useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {loginAction} from '@/app/(frontend)/login/actions'
import {CartContext} from '@/context/shopContext'
import s from './B2bLogin.module.scss'

export default function B2bLogin() {
  const router = useRouter()
  const ctx = useContext(CartContext)
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
    ctx?.refreshCartBuyer?.()
    router.push('/mikmax-for-business/area')
    router.refresh()
  }

  return (
    <form className={s.login} onSubmit={onSubmit} noValidate>
      <label className={s.visuallyHidden} htmlFor="b2b-email">
        E-mail
      </label>
      <input
        id="b2b-email"
        className={s.input}
        type="email"
        name="b2b-email"
        placeholder="E-mail"
        aria-label="E-mail"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label className={s.visuallyHidden} htmlFor="b2b-password">
        Password
      </label>
      <input
        id="b2b-password"
        className={s.input}
        type="password"
        name="b2b-password"
        placeholder="Password"
        aria-label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? '…' : 'Sign in'}
      </button>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <Link href="/login/forgot" className={s.forgot}>
        I forgot my password
      </Link>
      <p className={s.alt}>
        New to Mikmax{' '}
        <Link href="/mikmax-for-business/register" className={s.altLink}>
          Sign up here
        </Link>
      </p>
    </form>
  )
}
