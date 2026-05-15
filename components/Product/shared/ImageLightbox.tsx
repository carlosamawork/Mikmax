'use client'
import {useEffect} from 'react'
import {LazyImage} from '@/components/Common'
import type {GalleryImage} from '@/types/product'
import s from './ImageLightbox.module.scss'

interface Props {
  open: boolean
  images: GalleryImage[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

export default function ImageLightbox({open, images, index, onClose, onIndexChange}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndexChange(Math.max(0, index - 1))
      if (e.key === 'ArrowRight') onIndexChange(Math.min(images.length - 1, index + 1))
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, index, images.length, onClose, onIndexChange])

  if (!open || images.length === 0) return null
  const img = images[Math.max(0, Math.min(index, images.length - 1))]
  const width = img.width ?? 1440
  const height = img.height ?? 1920

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Image viewer">
      <button type="button" className={s.close} onClick={onClose} aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M1 1L13 13M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            strokeLinecap="square"
          />
        </svg>
      </button>
      <LazyImage
        src={img.url}
        alt={img.altText ?? ''}
        width={width}
        height={height}
        priority
        sizes="100vw"
        wrapperClassName={s.imageWrap}
        className={s.image}
      />
    </div>
  )
}
