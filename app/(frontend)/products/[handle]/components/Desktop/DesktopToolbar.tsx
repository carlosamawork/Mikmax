'use client'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import type {ProductView, ProductColor} from '../../_types'
import s from './DesktopToolbar.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
  onAddToCart: () => void
}

export default function DesktopToolbar({
  view,
  currentColor,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  onToggleInfo,
  isInfoOpen,
  onAddToCart,
}: Props) {
  const canAddToCart =
    !!selectedSize &&
    !!currentColor.sizes.find((sz) => sz.label === selectedSize)?.availableForSale
  return (
    <div className={s.toolbar}>
      <div className={s.titleBlock}>
        <div className={s.title}>{view.title}</div>
        <div className={s.priceBg}>
          <PriceLabel min={view.minPrice} max={view.maxPrice} currency={view.currency} />
        </div>
      </div>

      <div className={s.variantBlock}>
        <SizeSelector
          sizes={currentColor.sizes}
          selected={selectedSize}
          currency={view.currency}
          onSelect={onSelectSize}
        />
        <ColorSwatches colors={view.colors} selected={selectedColor} onSelect={onSelectColor} />
      </div>

      <button type="button" className={s.infoBlock} onClick={onToggleInfo}>
        <div className={s.infoTitle}>{isInfoOpen ? 'Close Information' : 'Product Information'}</div>
        <div className={s.infoMeta}>
          Estimated delivery : 1-3 November<br />
          Complimentary gift wrapping<br />
          30-day returns
        </div>
      </button>

      <button
        type="button"
        className={[s.cta, canAddToCart ? s.ctaActive : s.ctaInactive].join(' ')}
        onClick={onAddToCart}
        disabled={!canAddToCart}
      >
        {canAddToCart ? 'Add to Cart' : 'Please Select Size'}
      </button>

      <button
        type="button"
        className={s.favorite}
        aria-label="Add to favorites"
        aria-disabled="true"
      >
        ♡
      </button>
    </div>
  )
}
