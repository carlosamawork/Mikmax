'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ViewMode} from '@/types/shop'
import s from './ShopToolbar.module.scss'

// `hasEditorial`: solo cuando la colección tiene imágenes destacadas se ofrece la
// vista editorial. Sin ella, hay 2 vistas (1 = 4col, 2 = 2col); con ella, 3
// (1 = 4col, 2 = editorial, 3 = 2col).
export default function ViewToggle({
  value,
  hasEditorial = false,
}: {
  value: ViewMode
  hasEditorial?: boolean
}) {
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
      <span className={s.viewLabel}>Views</span>
      <button
        type="button"
        className={value === '4col' ? s.viewActive : s.viewInactive}
        aria-pressed={value === '4col'}
        onClick={() => setView('4col')}
      >
        1
      </button>
      {hasEditorial && (
        <button
          type="button"
          className={value === 'editorial' ? s.viewActive : s.viewInactive}
          aria-pressed={value === 'editorial'}
          onClick={() => setView('editorial')}
        >
          2
        </button>
      )}
      <button
        type="button"
        className={value === '2col' ? s.viewActive : s.viewInactive}
        aria-pressed={value === '2col'}
        onClick={() => setView('2col')}
      >
        {hasEditorial ? '3' : '2'}
      </button>
    </div>
  )
}
