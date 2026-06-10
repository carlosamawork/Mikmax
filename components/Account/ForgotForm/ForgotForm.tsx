'use client'

import Link from 'next/link'
import {FormEvent, useState} from 'react'
import AuthField from '@/components/Account/AuthField/AuthField'
import {recoverAction} from '@/app/(frontend)/login/actions'
import s from '../authForm.module.scss'

export default function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading || !email) return
    setLoading(true)
    await recoverAction(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <>
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <p className={s.heading}>Reset your password</p>

        {sent ? (
          <div className={s.terms}>
            <p>If an account exists for that email, we have sent you a link to reset your password.</p>
          </div>
        ) : (
          <>
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
            </div>
            <button type="submit" className={s.submit} disabled={loading}>
              {loading ? '…' : 'Continue'}
            </button>
          </>
        )}
      </form>

      <p className={s.altBottom}>
        Back to{' '}
        <Link href="/login" className={s.altLink}>
          Log in
        </Link>
      </p>
    </>
  )
}
