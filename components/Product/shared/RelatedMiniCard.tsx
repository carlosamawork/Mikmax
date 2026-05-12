import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceLabel from './PriceLabel'
import type {ProductMiniCard} from '@/types/product'
import s from './RelatedMiniCard.module.scss'

interface Props {
  product: ProductMiniCard
  currency: string
}

export default function RelatedMiniCard({product, currency}: Props) {
  const href = product.colorSlug
    ? `/products/${product.handle}?color=${product.colorSlug}`
    : `/products/${product.handle}`
  return (
    <Link href={href} className={s.card}>
      <div className={s.image}>
        {product.imageUrl ? (
          <LazyImage
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            wrapperClassName={s.imageWrapper}
            className={s.imageInner}
          />
        ) : (
          <div className={s.imagePlaceholder} />
        )}
      </div>
      <div className={s.body}>
        <div className={s.title}>{product.title}</div>
        {product.minPrice !== undefined && (
          <div className={s.price}>
            <PriceLabel min={product.minPrice} max={product.maxPrice} currency={currency} />
          </div>
        )}
      </div>
    </Link>
  )
}
