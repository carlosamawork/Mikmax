'use client'

import {useState} from 'react'
import s from './AuthField.module.scss'

type Props = {
  name: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
}

function EyeIcon({off}: {off: boolean}) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      {off && <path d="M4 4 20 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  )
}

export default function AuthField({
  name,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
}: Props) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && show ? 'text' : type

  return (
    <div className={s.field}>
      <label htmlFor={name} className={s.srOnly}>
        {placeholder}
      </label>
      <input
        id={name}
        name={name}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={s.input}
        autoComplete={autoComplete}
        required={required}
        aria-required={required}
      />
      {isPassword && (
        <button
          type="button"
          className={s.toggle}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          <EyeIcon off={show} />
        </button>
      )}
    </div>
  )
}
