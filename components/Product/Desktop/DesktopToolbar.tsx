'use client'
import {useState} from 'react'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import type {ProductView, ProductColor} from '@/types/product'
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
  const [hovered, setHovered] = useState<string | null>(null)
  // En la barra compacta de desktop hay un solo hueco: muestra el color bajo el
  // cursor o, si no hay hover, el seleccionado.
  const activeColorLabel =
    (hovered ? view.colors.find((c) => c.slug === hovered)?.label : undefined) ??
    currentColor.label
  return (
    <div className={s.toolbar}>
      <div className={s.titleBlock}>
        <div className={s.title}>
          <span className={s.titleText}>{view.title}</span>
          {activeColorLabel && <span className={s.titleColor}>{activeColorLabel}</span>}
        </div>
        <div className={s.priceBg}>
          <PriceLabel min={view.minPrice} max={view.maxPrice} currency={view.currency} />
        </div>
      </div>

      <div className={s.variantBlock}>
        <div className={s.variantRow}>
          <div className={[s.variantLabel, s.variantLabelSize].join(' ')}>Size:</div>
          <SizeSelector
            sizes={currentColor.sizes}
            selected={selectedSize}
            currency={view.currency}
            onSelect={onSelectSize}
            hideLabel
            widePanel
            productSubtitle={view.title}
          />
        </div>
        <div className={s.variantRow}>
          <div className={s.variantLabel}>Colors:</div>
          <ColorSwatches
            colors={view.colors}
            selected={selectedColor}
            onSelect={onSelectColor}
            onHover={setHovered}
          />
        </div>
      </div>

      <button type="button" className={s.infoBlock} onClick={onToggleInfo}>
        <div className={s.infoTitle}>{isInfoOpen ? 'Close Information' : 'Product Information'}</div>
        <div className={s.infoMeta}>
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
        <svg viewBox="0 0 12 11" fill="none" aria-hidden>
          <path
            d="M6 10C6 10 1 6.5 1 3.5C1 1.84 2.34 0.5 4 0.5C5 0.5 5.5 1 6 1.5C6.5 1 7 0.5 8 0.5C9.66 0.5 11 1.84 11 3.5C11 6.5 6 10 6 10Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </button>
    </div>
  )
}
