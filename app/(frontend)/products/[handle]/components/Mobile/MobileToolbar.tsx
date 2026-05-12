'use client'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import type {ProductView, ProductColor} from '../../_types'
import s from './MobileToolbar.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
}

export default function MobileToolbar({
  view,
  currentColor,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  onToggleInfo,
  isInfoOpen,
}: Props) {
  return (
    <div className={s.wrap}>
      <div className={s.titleBlock}>
        <div className={s.title}>{view.title}</div>
        <div className={s.price}>
          <PriceLabel min={view.minPrice} max={view.maxPrice} currency={view.currency} />
        </div>
        <div className={s.delivery}>
          Estimated delivery : 1-3 November<br />
          Complimentary gift wrapping<br />
          30- day returns
        </div>
      </div>

      <div className={s.section}>
        <SizeSelector
          sizes={currentColor.sizes}
          selected={selectedSize}
          currency={view.currency}
          onSelect={onSelectSize}
        />
      </div>

      <div className={s.section}>
        <div className={s.label}>Please select a color:</div>
        <ColorSwatches colors={view.colors} selected={selectedColor} onSelect={onSelectColor} />
      </div>

      <button type="button" className={s.infoToggle} onClick={onToggleInfo}>
        <span>{isInfoOpen ? 'Close Information' : 'Product Information'}</span>
        <span>{isInfoOpen ? '×' : '▾'}</span>
      </button>
    </div>
  )
}
