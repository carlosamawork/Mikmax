'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ViewMode} from '@/types/shop'
import s from './ShopToolbar.module.scss'

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
    <div className={s.viewGroup} role="group" aria-label="Vista">
      <span className={s.viewLabel}>Vista</span>
      <button
        type="button"
        className={value === '4col' ? s.viewActive : s.viewInactive}
        aria-pressed={value === '4col'}
        onClick={() => setView('4col')}
      >
        1
      </button>
      <button
        type="button"
        className={value === '2col' ? s.viewActive : s.viewInactive}
        aria-pressed={value === '2col'}
        onClick={() => setView('2col')}
      >
        3
      </button>
    </div>
  )
}
