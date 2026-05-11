'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ActiveFilter} from '@/types/shop'
import s from './ActiveFilterChips.module.scss'

interface Props {
  active: ActiveFilter[]
}

export default function ActiveFilterChips({active}: Props) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()
  if (active.length === 0) return null

  function remove(filter: ActiveFilter) {
    const next = new URLSearchParams(params.toString())
    if (filter.key === 'priceMin') {
      next.delete('priceMin')
      next.delete('priceMax')
    } else {
      const current = next.get(filter.key) ?? ''
      const remaining = current
        .split(',')
        .filter((v) => v && v !== filter.value)
        .join(',')
      if (remaining) next.set(filter.key, remaining)
      else next.delete(filter.key)
    }
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString())
    for (const f of active) {
      if (f.key === 'priceMin') {
        next.delete('priceMin')
        next.delete('priceMax')
      } else {
        next.delete(f.key)
      }
    }
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  return (
    <div className={s.chips}>
      {active.map((f) => (
        <button
          key={`${f.key}-${f.value}`}
          type="button"
          onClick={() => remove(f)}
          className={s.chip}
        >
          {f.label}: {f.displayValue} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" onClick={clearAll} className={s.clear}>
        Clear all
      </button>
    </div>
  )
}
