'use client'
import s from './StickyCTA.module.scss'

interface Props {
  canAddToCart: boolean
  onAddToCart: () => void
}

export default function StickyCTA({canAddToCart, onAddToCart}: Props) {
  return (
    <button
      type="button"
      className={[s.cta, canAddToCart ? s.ctaActive : s.ctaInactive].join(' ')}
      onClick={onAddToCart}
      disabled={!canAddToCart}
    >
      {canAddToCart ? 'Add to Cart' : 'Please Select Size'}
    </button>
  )
}
