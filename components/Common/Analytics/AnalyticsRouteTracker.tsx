'use client'

import {useEffect, useRef} from 'react'
import {usePathname, useSearchParams} from 'next/navigation'
import {trackPageView} from '@/lib/analytics/track'

export default function AnalyticsRouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirst = useRef(true)

  useEffect(() => {
    // La carga inicial ya la cuentan gtag('config') y fbq('PageView').
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const qs = searchParams?.toString()
    const path = qs ? `${pathname}?${qs}` : pathname
    trackPageView(path, window.location.href)
  }, [pathname, searchParams])

  return null
}
