'use client'
import type {ReactNode} from 'react'
import s from './FilterAccordion.module.scss'

interface Props {
  id: string
  title: string
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}

export default function FilterAccordion({id, title, open, onToggle, children}: Props) {
  return (
    <div className={s.accordion}>
      <button
        type="button"
        className={s.header}
        aria-expanded={open}
        aria-controls={`acc-${id}`}
        onClick={() => onToggle(id)}
      >
        <span className={s.title}>{title}</span>
        <svg
          className={`${s.chevron} ${open ? s.open : ''}`}
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0.377677 0.296449L5.65856 7.01758L10.9395 0.296448"
            stroke="currentColor"
            strokeWidth="0.960161"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div id={`acc-${id}`} hidden={!open} className={s.body}>
        {children}
      </div>
    </div>
  )
}
