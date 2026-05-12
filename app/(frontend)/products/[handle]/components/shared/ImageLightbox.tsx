'use client'
import {useEffect, useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {GalleryImage} from '../../_types'
import s from './ImageLightbox.module.scss'

interface Props {
  open: boolean
  images: GalleryImage[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

export default function ImageLightbox({open, images, index, onClose, onIndexChange}: Props) {
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!open) {
      setZoomed(false)
      return
    }
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

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Image viewer">
      <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
      {index > 0 && (
        <button type="button" className={[s.nav, s.navPrev].join(' ')} onClick={() => onIndexChange(index - 1)} aria-label="Previous">‹</button>
      )}
      {index < images.length - 1 && (
        <button type="button" className={[s.nav, s.navNext].join(' ')} onClick={() => onIndexChange(index + 1)} aria-label="Next">›</button>
      )}
      <div
        className={[s.imageWrap, zoomed ? s.imageWrapZoomed : ''].join(' ')}
        onClick={() => setZoomed((v) => !v)}
        style={{touchAction: 'pinch-zoom'}}
      >
        <LazyImage
          src={img.url}
          alt={img.altText ?? ''}
          fill
          sizes="100vw"
          className={s.image}
        />
      </div>
    </div>
  )
}
