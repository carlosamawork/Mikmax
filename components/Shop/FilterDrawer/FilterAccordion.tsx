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
        <span>{title}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id={`acc-${id}`} hidden={!open} className={s.body}>
        {children}
      </div>
    </div>
  )
}
