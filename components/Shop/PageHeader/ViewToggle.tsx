'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ViewMode} from '@/types/shop'
import s from './ViewToggle.module.scss'

export default function ViewToggle({value}: {value: ViewMode}) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  function setView(view: ViewMode) {
    const next = new URLSearchParams(params.toString())
    if (view === '4col') next.delete('view')
    else next.set('view', view)
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  return (
    <div className={s.toggle} role="group" aria-label="View">
      <button
        type="button"
        aria-pressed={value === '4col'}
        onClick={() => setView('4col')}
        className={value === '4col' ? s.active : ''}
        aria-label="4 columns"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="3" height="3" />
          <rect x="4.3" y="0" width="3" height="3" />
          <rect x="8.6" y="0" width="3" height="3" />
          <rect x="12.9" y="0" width="3" height="3" />
          <rect x="0" y="4.3" width="3" height="3" />
          <rect x="4.3" y="4.3" width="3" height="3" />
          <rect x="8.6" y="4.3" width="3" height="3" />
          <rect x="12.9" y="4.3" width="3" height="3" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={value === '2col'}
        onClick={() => setView('2col')}
        className={value === '2col' ? s.active : ''}
        aria-label="2 columns"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="7" height="7" />
          <rect x="9" y="0" width="7" height="7" />
          <rect x="0" y="9" width="7" height="7" />
          <rect x="9" y="9" width="7" height="7" />
        </svg>
      </button>
    </div>
  )
}
