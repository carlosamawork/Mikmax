'use client'

import s from './AccountField.module.scss'

type Props = {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}

export default function AccountField({
  name,
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: Props) {
  return (
    <div className={s.field}>
      <label htmlFor={name} className={s.label}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={s.input}
        required={required}
        aria-required={required}
        placeholder={placeholder}
      />
    </div>
  )
}
