// components/Layout/Footer/RegionSelector.tsx
'use client'

import {useEffect, useMemo, useState} from 'react'
import s from './RegionSelector.module.scss'
import type {FooterRegion} from '@/sanity/types'

interface Props {
  regions: FooterRegion[]
}

const STORAGE_KEY = 'mikmax_region'

export default function RegionSelector({regions}: Props) {
  const defaultRegion = useMemo(
    () => regions.find((r) => r.isDefault)?.code ?? regions[0]?.code,
    [regions],
  )
  const [active, setActive] = useState<string | undefined>(defaultRegion)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored && regions.some((r) => r.code === stored)) {
      setActive(stored)
    }
  }, [regions])

  if (regions.length === 0) return null

  const current = regions.find((r) => r.code === active) ?? regions[0]

  function pick(code: string) {
    setActive(code)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code)
    setOpen(false)
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>País: {current.label} ({current.currency})</span>
        <span className={s.icon} aria-hidden>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <ul className={s.list} role="listbox">
          {regions.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                className={`${s.item} ${r.code === active ? s.active : ''}`}
                onClick={() => pick(r.code)}
                role="option"
                aria-selected={r.code === active}
              >
                {r.label} ({r.currency})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
