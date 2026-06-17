'use client'
import {useState} from 'react'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import WishlistButton from '@/components/Account/WishlistButton/WishlistButton'
import type {ProductView, ProductColor} from '@/types/product'
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
  const [hovered, setHovered] = useState<string | null>(null)
  const hoveredLabel = hovered ? view.colors.find((c) => c.slug === hovered)?.label : undefined
  return (
    <div className={s.wrap}>
      <div className={s.titleBlock}>
        <WishlistButton handle={view.handle} color={selectedColor} className={s.favorite} />
        <div className={s.title}>
          {view.title}
          {currentColor.label && <span className={s.titleColor}>{currentColor.label}</span>}
        </div>
        <div className={s.price}>
          <PriceLabel
            min={view.minPrice}
            max={view.maxPrice}
            currency={view.currency}
            compareMin={view.compareMinPrice}
          />
        </div>
        <div className={s.delivery}>
          Complimentary gift wrapping
          <br />
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
        <div className={s.label}>Colors:</div>
        <div className={s.colorName}>{hoveredLabel ?? ' '}</div>
        <ColorSwatches
          colors={view.colors}
          selected={selectedColor}
          onSelect={onSelectColor}
          onHover={setHovered}
        />
      </div>

      <button type="button" className={s.infoToggle} onClick={onToggleInfo}>
        <span>{isInfoOpen ? 'Close Information' : 'Product Information'}</span>
        {isInfoOpen ? (
          <span aria-hidden>×</span>
        ) : (
          <svg className={s.caret} viewBox="0 0 10 6" fill="none" aria-hidden>
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
