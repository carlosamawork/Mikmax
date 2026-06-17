interface Props {
  min: number
  max?: number
  currency: string
  // Precio original (tachado) cuando hay descuento B2B aplicado al display.
  compareMin?: number
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function PriceLabel({min, max, currency, compareMin}: Props) {
  if (currency !== 'EUR') {
    return (
      <span>
        {min}
        {max && max !== min ? ` - ${max}` : ''} {currency}
      </span>
    )
  }
  const minStr = FMT.format(min)
  const priceStr = max === undefined || max === min ? minStr : `${minStr} - ${FMT.format(max)}`
  if (typeof compareMin === 'number' && compareMin > min) {
    return (
      <span>
        <s style={{opacity: 0.5, marginRight: 8}}>{FMT.format(compareMin)}</s>
        {priceStr}
      </span>
    )
  }
  return <span>{priceStr}</span>
}
