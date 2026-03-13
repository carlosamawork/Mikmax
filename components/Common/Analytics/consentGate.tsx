'use client'

import {useConsent} from '@/hooks/useConsent'

export default function ConsentGate({
  category,
  children,
}: {
  category: 'analytics' | 'marketing'
  children: React.ReactNode
}) {
  const {consent} = useConsent()

  if (!consent) return null
  if (!consent[category]) return null

  return <>{children}</>
}
