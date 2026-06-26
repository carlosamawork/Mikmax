'use client'

import {FormEvent, useState} from 'react'
import Link from 'next/link'
import type {B2bClientType, B2bRegisterInput} from '@/types/b2b'
import {COUNTRIES} from '@/lib/b2b/countries'
import s from './B2bRegisterForm.module.scss'

type ResultStatus = 'approved' | 'review' | 'rejected'

const RESULT_COPY: Record<ResultStatus, {title: string; body: string}> = {
  approved: {
    title: 'Welcome to Mikmax for Business',
    body: 'Your account has been approved. You can now sign in with your email and password.',
  },
  review: {
    title: 'We are reviewing your request',
    body: 'We have received your details. We will get in touch as soon as we validate your company.',
  },
  rejected: {
    title: 'We need more information',
    body: 'We could not validate your request automatically. Check your email to continue.',
  },
}

const EMPTY: B2bRegisterInput = {
  clientType: 'reseller',
  country: 'ES',
  legalCompanyName: '',
  vatNumber: '',
  companyWebsite: '',
  corporateEmail: '',
  fiscalAddress: '',
  password: '',
}

export default function B2bRegisterForm() {
  const [form, setForm] = useState<B2bRegisterInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultStatus | null>(null)

  function set<K extends keyof B2bRegisterInput>(key: K, value: B2bRegisterInput[K]) {
    setForm((f) => ({...f, [key]: value}))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/b2b/register/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('We could not process your request. Check your details and try again.')
        setLoading(false)
        return
      }
      setResult(data.status as ResultStatus)
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  if (result) {
    const copy = RESULT_COPY[result]
    return (
      <div className={s.result} role="status">
        <p className={s.resultTitle}>{copy.title}</p>
        <p className={s.resultBody}>{copy.body}</p>
        {result === 'approved' && (
          <Link href="/mikmax-for-business" className={s.resultLink}>
            Go to sign in
          </Link>
        )}
      </div>
    )
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.heading}>Create a business account</p>

      <fieldset className={s.clientType}>
        <legend className={s.srOnly}>Client type</legend>
        {(['reseller', 'designer'] as B2bClientType[]).map((t) => (
          <label key={t} className={s.radio}>
            <input
              type="radio"
              name="clientType"
              value={t}
              checked={form.clientType === t}
              onChange={() => set('clientType', t)}
            />
            {t === 'reseller' ? 'Reseller' : 'Interior Designer'}
          </label>
        ))}
      </fieldset>

      <div className={s.fields}>
        <select
          className={s.select}
          value={form.country}
          onChange={(e) => set('country', e.target.value)}
          aria-label="Country"
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          className={s.input}
          placeholder="Legal company name"
          value={form.legalCompanyName}
          onChange={(e) => set('legalCompanyName', e.target.value)}
          autoComplete="organization"
          required
        />
        <input
          className={s.input}
          placeholder="VAT number"
          value={form.vatNumber}
          onChange={(e) => set('vatNumber', e.target.value)}
          required
        />
        <input
          className={s.input}
          type="url"
          placeholder="Company website"
          value={form.companyWebsite}
          onChange={(e) => set('companyWebsite', e.target.value)}
          autoComplete="url"
        />
        <input
          className={s.input}
          type="email"
          placeholder="Corporate email"
          value={form.corporateEmail}
          onChange={(e) => set('corporateEmail', e.target.value)}
          autoComplete="email"
          required
        />
        <textarea
          className={s.textarea}
          placeholder="Fiscal address"
          value={form.fiscalAddress}
          onChange={(e) => set('fiscalAddress', e.target.value)}
          rows={3}
          required
        />
        <input
          className={s.input}
          type="password"
          placeholder="Password (min. 8 characters)"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
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
        {loading ? '…' : 'Create account'}
      </button>

      <p className={s.altBottom}>
        Already have a business account?{' '}
        <Link href="/mikmax-for-business" className={s.altLink}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
