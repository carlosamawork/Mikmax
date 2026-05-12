import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceLabel from './PriceLabel'
import type {ProductMiniCard} from '../../_types'
import s from './RelatedMiniCard.module.scss'

interface Props {
  product: ProductMiniCard
  currency: string
}

export default function RelatedMiniCard({product, currency}: Props) {
  return (
    <Link href={`/products/${product.handle}`} className={s.card}>
      <div className={s.image}>
        {product.imageUrl ? (
          <LazyImage
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
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
