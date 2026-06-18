'use client'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import s from './StickyCTA.module.scss'

interface Props {
  canAddToCart: boolean
  onAddToCart: () => void
  copy: Pick<Dictionary['pdp'], 'addToCart' | 'selectSizeCta'>
}

export default function StickyCTA({canAddToCart, onAddToCart, copy}: Props) {
  return (
    <button
      type="button"
      className={[s.cta, canAddToCart ? s.ctaActive : s.ctaInactive].join(' ')}
      onClick={onAddToCart}
      disabled={!canAddToCart}
    >
      {canAddToCart ? copy.addToCart : copy.selectSizeCta}
    </button>
  )
}
