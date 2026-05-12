'use client'
import {useRef, useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {GalleryImage} from '@/types/product'
import s from './GallerySwiper.module.scss'

interface Props {
  images: GalleryImage[]
  onZoom: (index: number) => void
}

const SWIPE_THRESHOLD = 50

export default function GallerySwiper({images, onZoom}: Props) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)

  if (images.length === 0) return null

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(images.length - 1, i + delta)))
  }

  return (
    <div
      className={s.swiper}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx > 0 ? -1 : 1)
        startX.current = null
      }}
    >
      <LazyImage
        src={images[index].url}
        alt={images[index].altText ?? ''}
        fill
        sizes="100vw"
        priority={index === 0}
        wrapperClassName={s.imageWrapper}
        className={s.galleryImg}
      />
      {index > 0 && (
        <button
          type="button"
          className={[s.nav, s.navPrev].join(' ')}
          onClick={() => go(-1)}
          aria-label="Previous"
        >
          ‹
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          className={[s.nav, s.navNext].join(' ')}
          onClick={() => go(1)}
          aria-label="Next"
        >
          ›
        </button>
      )}
      <button
        type="button"
        className={s.zoomBtn}
        onClick={() => onZoom(index)}
        aria-label="Zoom"
      >
        +
      </button>
    </div>
  )
}
