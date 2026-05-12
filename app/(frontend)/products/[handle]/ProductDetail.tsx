'use client'
import {useEffect, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {findEquivalentSize} from '@/lib/product/findEquivalentSize'
import ColorSwatches from './components/shared/ColorSwatches'
import type {ProductView, ProductInitialState} from './_types'

interface Props {
  view: ProductView
  initial: ProductInitialState
}

export default function ProductDetail({view, initial}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [selectedColor, setSelectedColor] = useState<string>(initial.color)
  const [selectedSize, setSelectedSize] = useState<string | undefined>(initial.size)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{open: boolean; index: number}>({open: false, index: 0})

  // URL sync (shallow replace, no scroll, no history entry per change)
  useEffect(() => {
    const usp = new URLSearchParams()
    if (selectedColor && selectedColor !== view.defaultColorSlug) usp.set('color', selectedColor)
    if (selectedSize) usp.set('size', selectedSize)
    const qs = usp.toString()
    const target = qs ? `${pathname}?${qs}` : pathname
    router.replace(target, {scroll: false})
  }, [selectedColor, selectedSize, pathname, router, view.defaultColorSlug])

  function changeColor(slug: string) {
    setSelectedColor(slug)
    setSelectedSize((prev) => findEquivalentSize(view, slug, prev))
  }

  const currentColor = view.colors.find((c) => c.slug === selectedColor) ?? view.colors[0]

  return (
    <div style={{padding: 20}}>
      <pre style={{fontSize: 11, fontFamily: 'monospace'}}>
        {JSON.stringify(
          {
            selectedColor,
            selectedSize,
            isInfoOpen,
            lightbox,
            currentColorImages: currentColor.images.length,
          },
          null,
          2,
        )}
      </pre>
      <div style={{display: 'flex', gap: 10, marginTop: 10, flexDirection: 'column'}}>
        <ColorSwatches colors={view.colors} selected={selectedColor} onSelect={changeColor} />
        <div style={{display: 'flex', gap: 10}}>
          <button type="button" onClick={() => setSelectedSize(currentColor.sizes[0]?.label)}>
            Pick first size (test)
          </button>
          <button type="button" onClick={() => setIsInfoOpen((v) => !v)}>
            Toggle info (test)
          </button>
        </div>
      </div>
    </div>
  )
}
