import {formatMoney} from '@/lib/money'
import type {Locale} from '@/lib/i18n/config'

interface Props {
  min: number
  max?: number
  currency: string
  locale?: Locale
  // Precio original (tachado) cuando hay descuento B2B aplicado al display.
  compareMin?: number
}

export default function PriceLabel({min, max, currency, locale = 'en', compareMin}: Props) {
  const fmt = (n: number) => formatMoney({amount: n, currencyCode: currency}, locale)
  const minStr = fmt(min)
  const priceStr = max === undefined || max === min ? minStr : `${minStr} - ${fmt(max)}`
  if (typeof compareMin === 'number' && compareMin > min) {
    return (
      <span>
        <s style={{opacity: 0.5, marginRight: 8}}>{fmt(compareMin)}</s>
        {priceStr}
      </span>
    )
  }
  return <span>{priceStr}</span>
}
