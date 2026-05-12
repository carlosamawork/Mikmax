'use client'
import {useEffect, useRef} from 'react'
import {LazyImage} from '@/components/Common'
import RelatedMiniCard from '../shared/RelatedMiniCard'
import type {GalleryImage, ProductMiniCard} from '@/types/product'
import s from './GalleryHorizontal.module.scss'

interface Props {
  images: GalleryImage[]
  related: ProductMiniCard[]
  currency: string
  onZoom: (index: number) => void
}

export default function GalleryHorizontal({images, related, currency, onZoom}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Convert vertical wheel to horizontal scroll
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, {passive: false})
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div ref={scrollerRef} className={s.scroller}>
      {images.map((img, i) => {
        const aspect = img.width && img.height ? `${img.width} / ${img.height}` : undefined
        return (
          <div
            key={i}
            className={s.imageTile}
            style={aspect ? {aspectRatio: aspect} : undefined}
          >
            <LazyImage
              src={img.url}
              alt={img.altText ?? ''}
              width={img.width ?? 1200}
              height={img.height ?? 1200}
              sizes="(max-width: 768px) 100vw, 80vh"
              priority={i === 0}
              wrapperClassName={s.imageWrapper}
              className={s.galleryImg}
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
        )
      })}
      {related.length > 0 && (
        <div className={s.relatedSection}>
          <div className={s.relatedHeading}>Related products</div>
          <div className={s.relatedRow}>
            {related.map((p) => (
              <div key={p.handle} className={s.relatedTile}>
                <RelatedMiniCard product={p} currency={currency} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
