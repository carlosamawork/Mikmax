'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import s from './ShopToolbar.module.scss'

export default function FilterTrigger() {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  function open() {
    const next = new URLSearchParams(params.toString())
    next.set('filters', 'open')
    router.push(`${path}?${next.toString()}`, {scroll: false})
  }

  return (
    <button type="button" onClick={open} className={s.filters}>
      Filters
    </button>
  )
}
