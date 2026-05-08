import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '../PriceDisplay/PriceDisplay'
import type {ProductCardData} from '@/sanity/types'
import s from './ProductCard.module.scss'

interface Props {
  product: ProductCardData
  className?: string
  // Optional override: when the dispatcher already projects compareAt, use it.
  showTag?: boolean
}

function hasNovedadTag(tags?: string): boolean {
  if (!tags) return false
  return tags
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .some((t) => t === 'novedad' || t === 'novedades' || t === 'new')
}

export default function ProductCard({product, className, showTag = true}: Props) {
  const href = product.handle ? `/shop/product/${product.handle}` : '#'
  const tag = showTag && hasNovedadTag(product.tags) ? 'Novedades' : null

  return (
    <Link href={href} className={`${s.card} ${className ?? ''}`.trim()}>
      <div className={s.media}>
        {product.imageUrl && (
          <LazyImage
            src={product.imageUrl}
            alt={product.title ?? ''}
            width={357}
            height={476}
            className={s.img}
          />
        )}
        {tag && <p className={s.tag}>{tag}</p>}
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
