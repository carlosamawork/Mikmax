import s from './PriceDisplay.module.scss'

interface Props {
  min?: number
  max?: number
  compareAt?: number
  className?: string
}

const formatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

function format(n: number): string {
  return formatter.format(n)
}

export default function PriceDisplay({min, max, compareAt, className}: Props) {
  if (typeof min !== 'number') return null

  const range = typeof max === 'number' && max > min ? `${format(min)} – ${format(max)}` : format(min)
  const showCompare = typeof compareAt === 'number' && compareAt > min

  return (
    <p className={`${s.root} ${className ?? ''}`.trim()}>
      <span>{range}</span>
      {showCompare && <span className={s.compare}>{format(compareAt!)}</span>}
    </p>
  )
}
