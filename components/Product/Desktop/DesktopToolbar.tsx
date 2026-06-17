'use client'
import {useState} from 'react'
import Link from 'next/link'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import {useWishlistItem} from '@/context/wishlistContext'
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
    !!selectedSize && !!currentColor.sizes.find((sz) => sz.label === selectedSize)?.availableForSale
  const [hovered, setHovered] = useState<string | null>(null)
  // Nombre del color bajo el cursor (vacío sin hover). El título muestra siempre
  // el color seleccionado con click.
  const hoveredLabel = hovered ? view.colors.find((c) => c.slug === hovered)?.label : undefined
  // Wishlist por color elegido.
  const fav = useWishlistItem(view.handle, selectedColor)
  return (
    <div className={s.toolbar}>
      <div className={s.titleBlock}>
        <div className={s.title}>
          <span className={s.titleText}>{view.title}</span>
          {currentColor.label && <span className={s.titleColor}>{currentColor.label}</span>}
        </div>
        <div className={s.priceBg}>
          <PriceLabel
            min={view.minPrice}
            max={view.maxPrice}
            currency={view.currency}
            compareMin={view.compareMinPrice}
          />
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
          <div className={[s.variantLabel, s.variantLabelColor].join(' ')}>
            <span>Colors:</span>
            <span className={s.hoverName}>{hoveredLabel ?? ''}</span>
          </div>
          <ColorSwatches
            colors={view.colors}
            selected={selectedColor}
            onSelect={onSelectColor}
            onHover={setHovered}
          />
        </div>
      </div>

      <button type="button" className={s.infoBlock} onClick={onToggleInfo}>
        <div className={s.infoTitle}>
          {isInfoOpen ? 'Close Information' : 'Product Information'}
        </div>
        <div className={s.infoMeta}>
          Complimentary gift wrapping
          <br />
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

      <span className={s.favoriteWrap}>
        <button
          type="button"
          className={s.favorite}
          onClick={fav.onClick}
          aria-pressed={fav.active}
          aria-label={fav.active ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg viewBox="0 0 7 9" fill="none" aria-hidden>
            <path
              d="M0.0185414 0H6.99937C6.98115 2.9491 6.95575 8.79725 6.99717 8.99486C6.99992 8.99826 7.00069 9 6.99937 9C6.99862 9 6.99788 8.99827 6.99717 8.99486C6.90662 8.883 4.66551 6.97253 3.52286 6.00299L0 8.91924L0.0185414 0Z"
              fill="currentColor"
            />
          </svg>
        </button>
        {fav.hint && (
          <span className={s.favoriteHint} role="alert">
            <Link href="/login" className={s.favoriteHintLink}>
              Log in
            </Link>{' '}
            to save it
          </span>
        )}
      </span>
    </div>
  )
}
