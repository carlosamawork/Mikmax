'use client'

import {FormEvent, useState} from 'react'
import {useRouter} from 'next/navigation'
import AccountField from '@/components/Account/AccountField/AccountField'
import {updateShipping} from '@/app/(frontend)/account/actions'
import {COUNTRIES, DEFAULT_COUNTRY, DEFAULT_DIAL} from '@/lib/account/countries'
import {PROVINCES_BY_COUNTRY} from '@/lib/account/provinces'
import type {Customer} from '@/types/account'
import s from '../accountForm.module.scss'

// Separa "+34698456743" en prefijo + número usando los prefijos conocidos (más largos primero).
function splitPhone(phone?: string | null): {dial: string; number: string} {
  if (!phone) return {dial: DEFAULT_DIAL, number: ''}
  const dial = COUNTRIES.map((c) => c.dial)
    .sort((a, b) => b.length - a.length)
    .find((d) => phone.startsWith(d))
  return dial ? {dial, number: phone.slice(dial.length)} : {dial: DEFAULT_DIAL, number: phone}
}

export default function ShippingForm({customer}: {customer: Customer}) {
  const router = useRouter()
  const addr = customer.defaultAddress
  const initPhone = splitPhone(addr?.phone || customer.phone)

  const [address1, setAddress1] = useState(addr?.address1 ?? '')
  const [zip, setZip] = useState(addr?.zip ?? '')
  const [city, setCity] = useState(addr?.city ?? '')
  const [province, setProvince] = useState(addr?.province ?? '')
  const [country, setCountry] = useState(addr?.country ?? DEFAULT_COUNTRY)
  const [phoneCountry, setPhoneCountry] = useState(initPhone.dial)
  const [phone, setPhone] = useState(initPhone.number)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'saving') return
    setError(null)
    setStatus('saving')
    const res = await updateShipping({address1, zip, city, province, country, phoneCountry, phone})
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
      <h2 className={s.title}>Shipping information</h2>

      <AccountField name="address1" label="Address 1" value={address1} onChange={setAddress1} />
      <AccountField name="zip" label="Postal code" value={zip} onChange={setZip} />
      <AccountField name="city" label="City" value={city} onChange={setCity} />

      {/* Provincia: selector si el país tiene lista (mercado); texto libre si no. */}
      {PROVINCES_BY_COUNTRY[country] ? (
        <div className={s.field}>
          <label htmlFor="province" className={s.selectLabel}>
            Province
          </label>
          <select
            id="province"
            className={s.select}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">Select province</option>
            {PROVINCES_BY_COUNTRY[country].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <AccountField name="province" label="Province" value={province} onChange={setProvince} />
      )}

      <div className={s.field}>
        <label htmlFor="country" className={s.selectLabel}>
          Country
        </label>
        <select
          id="country"
          className={s.select}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={s.phoneRow}>
        <div className={s.field}>
          <label htmlFor="phoneCountry" className={s.selectLabel}>
            Country
          </label>
          <select
            id="phoneCountry"
            className={s.select}
            value={phoneCountry}
            onChange={(e) => setPhoneCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={`${c.name}${c.dial}`} value={c.dial}>
                {c.name} {c.dial}
              </option>
            ))}
          </select>
        </div>
        <AccountField
          name="phone"
          label="Phone number *"
          value={phone}
          onChange={setPhone}
          type="tel"
        />
      </div>

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
