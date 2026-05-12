interface Props {
  min: number
  max?: number
  currency: string
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function PriceLabel({min, max, currency}: Props) {
  if (currency !== 'EUR') {
    return (
      <span>
        {min}
        {max && max !== min ? ` - ${max}` : ''} {currency}
      </span>
    )
  }
  const minStr = FMT.format(min)
  if (max === undefined || max === min) return <span>{minStr}</span>
  return <span>{minStr} - {FMT.format(max)}</span>
}
