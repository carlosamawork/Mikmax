'use client'

import {useRouter} from 'next/navigation'
import {FormEvent, useState} from 'react'
import AuthField from '@/components/Account/AuthField/AuthField'
import {resetAction} from '@/app/(frontend)/login/actions'
import s from '../authForm.module.scss'

export default function ResetForm({id, token}: {id: string; token: string}) {
  const router = useRouter()
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
    setLoading(true)
    const res = await resetAction({id, token, password})
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    router.push('/account')
    router.refresh()
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.heading}>Set a new password</p>

      <div className={s.fields}>
        <AuthField
          name="password"
          type="password"
          placeholder="New password"
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
    </form>
  )
}
