// components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {
  ImageWithProductBlock,
  ImageWithProductFeature,
  ImageWithProductProduct,
} from '@/sanity/types'
import s from './ImageWithProduct.module.scss'

interface Props {
  block: ImageWithProductBlock
}

function FeatureMedia({feature}: {feature: ImageWithProductFeature}) {
  if (!feature.image?.imageUrl) return null
  const w = feature.image.metadata?.dimensions?.width ?? 1440
  const h = feature.image.metadata?.dimensions?.height ?? 1920
  return (
    <LazyImage
      src={feature.image.imageUrl}
      alt={feature.image.alt ?? ''}
      width={w}
      height={h}
      className={s.mediaImg}
      wrapperClassName={s.media}
      priority
    />
  )
}

function FeatureCell({feature}: {feature: ImageWithProductFeature}) {
  const inner = (
    <>
      <FeatureMedia feature={feature} />
      {feature.title && <p className={s.title}>{feature.title}</p>}
    </>
  )

  if (!feature.url) {
    return <div className={s.featureCell}>{inner}</div>
  }
  if (feature.url.startsWith('/')) {
    return (
      <Link href={feature.url} className={s.featureCell}>
        {inner}
      </Link>
    )
  }
  return (
    <a
      href={feature.url}
      className={s.featureCell}
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  )
}

// Placeholder until Phase 4 brings <ProductCard> proper. Renders the
// preview image + title + simple price line. Once ProductCard exists
// we swap this out for `<ProductCard product={...} variant="mini" />`.
function ProductCell({product}: {product: ImageWithProductProduct}) {
  const href = product.handle ? `/shop/product/${product.handle}` : '#'
  const formatPrice = (n?: number) =>
    typeof n === 'number'
      ? new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 2,
        }).format(n)
      : null

  return (
    <Link href={href} className={s.productCell}>
      <div className={s.productImage}>
        {product.imageUrl && (
          <LazyImage
            src={product.imageUrl}
            alt={product.title ?? ''}
            width={357}
            height={476}
            className={s.productImageImg}
            wrapperClassName={s.productImageWrap}
          />
        )}
      </div>
      <div className={s.productInfo}>
        {product.title && <p className={s.productTitle}>{product.title}</p>}
        {/* {(() => {
          const min = formatPrice(product.price)
          const max = formatPrice(product.compareAtPrice)
          if (!min) return null
          if (max && max !== min) {
            return (
              <p className={s.productPrice}>
                {min} – {max}
              </p>
            )
          }
          return <p className={s.productPrice}>{min}</p>
        })()} */}
      </div>
    </Link>
  )
}

export default function ImageWithProduct({block}: Props) {
  const {feature, product, imagePosition} = block
  if (!feature && !product) return null
  const sectionCls = `${s.section} ${imagePosition === 'right' ? s.imageRight : ''}`.trim()
  return (
    <section className={sectionCls}>
      {feature && <FeatureCell feature={feature} />}
      {product && <ProductCell product={product} />}
    </section>
  )
}
