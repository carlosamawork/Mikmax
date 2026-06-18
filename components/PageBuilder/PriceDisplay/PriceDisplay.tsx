import {formatMoney} from '@/lib/money'
import {getStoreCurrency} from '@/lib/analytics/item'
import s from './PriceDisplay.module.scss'

interface Props {
  min?: number
  max?: number
  compareAt?: number
  className?: string
  // Optional: ISO 4217 currency code from Shopify. Defaults to NEXT_PUBLIC_CURRENCY env var.
  // Client components that lack a currencyCode can omit this and the env fallback is used.
  currency?: string
}

export default function PriceDisplay({min, max, compareAt, className, currency}: Props) {
  if (typeof min !== 'number') return null

  // Server component: locale flag is OFF in production so 'en' is correct today.
  // Locale-threading is deferred to a later pass.
  const code = currency ?? getStoreCurrency()
  const fmt = (n: number) => formatMoney({amount: n, currencyCode: code}, 'en')

  const range = typeof max === 'number' && max > min ? `${fmt(min)} – ${fmt(max)}` : fmt(min)
  const showCompare = typeof compareAt === 'number' && compareAt > min

  return (
    <p className={`${s.root} ${className ?? ''}`.trim()}>
      <span>{range}</span>
      {showCompare && <span className={s.compare}>{fmt(compareAt!)}</span>}
    </p>
  )
}
