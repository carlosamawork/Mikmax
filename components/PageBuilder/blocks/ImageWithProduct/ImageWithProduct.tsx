// components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import ProductCard from '../../ProductCard/ProductCard'
import type {ImageWithProductBlock, ImageWithProductFeature} from '@/sanity/types'
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
    <a href={feature.url} className={s.featureCell} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  )
}

export default function ImageWithProduct({block}: Props) {
  const {feature, product, imagePosition} = block
  if (!feature && !product) return null
  const sectionCls = `${s.section} ${imagePosition === 'right' ? s.imageRight : ''}`.trim()
  return (
    <section className={sectionCls}>
      {feature && <FeatureCell feature={feature} />}
      {product && (
        <div className={s.productCellWrap}>
          <ProductCard product={product} />
        </div>
      )}
    </section>
  )
}
