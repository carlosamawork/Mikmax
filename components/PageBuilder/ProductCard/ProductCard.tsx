import Link from 'next/link'
import type {CSSProperties} from 'react'
import {LazyImage} from '@/components/Common'
import WishlistButton from '@/components/Account/WishlistButton/WishlistButton'
import PriceDisplay from '../PriceDisplay/PriceDisplay'
import type {ProductCardData} from '@/sanity/types'
import {buildImageAlt} from '@/lib/seo/imageAlt'
import s from './ProductCard.module.scss'

interface Props {
  product: ProductCardData
  className?: string
  // Set to false to hide the "Novedades" badge even if the product has the tag.
  showTag?: boolean
  // Llena el alto de su celda (grid editorial Vista 2) en vez de usar el aspect fijo.
  fill?: boolean
  // Usa la 2ª imagen de la galería de la variante (tile destacada de Vista 2).
  preferSecondary?: boolean
  style?: CSSProperties
}

function hasNovedadTag(tags?: string): boolean {
  if (!tags) return false
  return tags
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .some((t) => t === 'novedad' || t === 'novedades' || t === 'new')
}

export default function ProductCard({
  product,
  className,
  showTag = true,
  fill = false,
  preferSecondary = false,
  style,
}: Props) {
  const href = product.handle
    ? product.colorSlug
      ? `/products/${product.handle}?color=${product.colorSlug}`
      : `/products/${product.handle}`
    : '#'
  const tag = showTag && hasNovedadTag(product.tags) ? 'Novedades' : null
  const soldOut = product.availableForSale === false
  const imageUrl =
    preferSecondary && product.secondaryImageUrl ? product.secondaryImageUrl : product.imageUrl

  return (
    <Link
      href={href}
      className={`${s.card} ${fill ? s.cardFill : ''} ${className ?? ''}`.trim()}
      style={style}
    >
      <div className={s.media}>
        {imageUrl && (
          <LazyImage
            src={imageUrl}
            alt={product.imageAlt || buildImageAlt({title: product.title, color: product.colorLabel})}
            width={357}
            height={476}
            sizes={fill ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            className={s.img}
          />
        )}
        {tag && <p className={s.tag}>{tag}</p>}
        {soldOut && <p className={s.soldOut}>Agotado</p>}
        {product.handle && (
          <WishlistButton
            handle={product.handle}
            color={product.colorSlug}
            className={s.wishlist}
          />
        )}
      </div>
      <div className={s.info}>
        {product.title && <p className={s.title}>{product.title}</p>}
        <PriceDisplay
          min={product.minPrice}
          max={product.maxPrice}
          compareAt={product.compareAtPrice}
        />
      </div>
    </Link>
  )
}
