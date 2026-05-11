'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import s from './FilterTrigger.module.scss'

export default function FilterTrigger({count}: {count: number}) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  function open() {
    const next = new URLSearchParams(params.toString())
    next.set('filters', 'open')
    router.push(`${path}?${next.toString()}`, {scroll: false})
  }

  return (
    <button type="button" onClick={open} className={s.trigger}>
      Filter &amp; Sort {count > 0 && <span className={s.count}>({count})</span>}
    </button>
  )
}
