import {formatMoney} from '@/lib/money'
import s from './LookPrice.module.scss'

interface Props {
  allSelected: boolean
  minTotal: number
  maxTotal: number
  summedTotal: number
  discountedTotal: number
  hasDiscount: boolean
  currency: string
}

export default function LookPrice({
  allSelected,
  minTotal,
  maxTotal,
  summedTotal,
  discountedTotal,
  hasDiscount,
  currency,
}: Props) {
  // Server component: locale flag is OFF in production so 'en' is correct today.
  // Locale-threading is deferred to a later pass.
  const fmt = (n: number) => formatMoney({amount: n, currencyCode: currency}, 'en')

  if (!allSelected) {
    const range = minTotal === maxTotal ? fmt(minTotal) : `${fmt(minTotal)} – ${fmt(maxTotal)}`
    return <p className={s.price}>{range}</p>
  }

  if (hasDiscount && discountedTotal < summedTotal) {
    return (
      <p className={s.price}>
        <span className={s.original}>{fmt(summedTotal)}</span>
        <span className={s.discounted}>{fmt(discountedTotal)}</span>
      </p>
    )
  }

  return <p className={s.price}>{fmt(summedTotal)}</p>
}
