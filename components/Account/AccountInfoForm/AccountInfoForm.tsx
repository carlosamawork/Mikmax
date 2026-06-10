'use client'

import {FormEvent, useState} from 'react'
import {useRouter} from 'next/navigation'
import AccountField from '@/components/Account/AccountField/AccountField'
import {updateAccountInfo} from '@/app/(frontend)/account/actions'
import type {Customer} from '@/types/account'
import s from '../accountForm.module.scss'

// ISO 'YYYY-MM-DD' → 'DD/MM/YYYY' para mostrar.
function isoToDisplay(iso?: string | null): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export default function AccountInfoForm({customer}: {customer: Customer}) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(customer.firstName ?? '')
  const [lastName, setLastName] = useState(customer.lastName ?? '')
  const [birthday, setBirthday] = useState(isoToDisplay(customer.metafield?.value))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'saving') return
    setError(null)
    setStatus('saving')
    const res = await updateAccountInfo({firstName, lastName, birthday})
    if (!res.ok) {
      setStatus('idle')
      setError(res.error)
      return
    }
    setStatus('saved')
    router.refresh()
  }

  return (
    <form className={s.section} onSubmit={onSubmit} noValidate>
      <h2 className={s.title}>Account information</h2>

      <AccountField name="firstName" label="First name" value={firstName} onChange={setFirstName} />
      <AccountField name="lastName" label="Last name" value={lastName} onChange={setLastName} />
      <AccountField
        name="birthday"
        label="Date of birth (DD/MM/YYYY) *"
        value={birthday}
        onChange={setBirthday}
        placeholder="DD/MM/YYYY"
      />

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <div className={s.actions}>
        <button type="submit" className={s.save} disabled={status === 'saving'}>
          {status === 'saving' ? '…' : status === 'saved' ? 'Saved' : 'Save'}
        </button>
      </div>
    </form>
  )
}
