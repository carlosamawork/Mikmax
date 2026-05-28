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

function fmt(n: number): string {
  return `€${n.toFixed(2)}`
}

export default function LookPrice({
  allSelected,
  minTotal,
  maxTotal,
  summedTotal,
  discountedTotal,
  hasDiscount,
}: Props) {
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
