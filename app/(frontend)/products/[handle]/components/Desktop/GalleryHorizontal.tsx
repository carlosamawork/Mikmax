'use client'
import {LazyImage} from '@/components/Common'
import RelatedMiniCard from '../shared/RelatedMiniCard'
import type {GalleryImage, ProductMiniCard} from '../../_types'
import s from './GalleryHorizontal.module.scss'

interface Props {
  images: GalleryImage[]
  related: ProductMiniCard[]
  currency: string
  onZoom: (index: number) => void
}

export default function GalleryHorizontal({images, related, currency, onZoom}: Props) {
  return (
    <div className={s.scroller}>
      {images.map((img, i) => (
        <div key={i} className={s.imageTile}>
          <LazyImage
            src={img.url}
            alt={img.altText ?? ''}
            fill
            sizes="676px"
            priority={i === 0}
          />
          <button
            type="button"
            className={s.zoomBtn}
            onClick={() => onZoom(i)}
            aria-label="Zoom image"
          >
            +
          </button>
        </div>
      ))}
      {related.length > 0 && (
        <>
          <div className={s.relatedHeading}>Related products</div>
          {related.map((p) => (
            <div key={p.handle} className={s.relatedTile}>
              <RelatedMiniCard product={p} currency={currency} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
