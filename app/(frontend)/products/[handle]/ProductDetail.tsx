'use client'
import {useEffect, useState} from 'react'
import dynamic from 'next/dynamic'
import {usePathname, useRouter} from 'next/navigation'
import {findEquivalentSize} from '@/lib/product/findEquivalentSize'
import DesktopLayout from './components/Desktop/DesktopLayout'
import MobileLayout from './components/Mobile/MobileLayout'
import ProductInfoPanel from './components/shared/ProductInfoPanel'
import type {ProductView, ProductInitialState} from './_types'

const ImageLightbox = dynamic(() => import('./components/shared/ImageLightbox'), {ssr: false})

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

  function handleAddToCart() {
    // Real implementation in Task 26 (cart drawer integration). For now, log.
    // eslint-disable-next-line no-console
    console.log('add to cart', {color: selectedColor, size: selectedSize})
  }

  const currentColor = view.colors.find((c) => c.slug === selectedColor) ?? view.colors[0]

  return (
    <>
      <DesktopLayout
        view={view}
        currentColor={currentColor}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onSelectColor={changeColor}
        onSelectSize={setSelectedSize}
        onToggleInfo={() => setIsInfoOpen((v) => !v)}
        isInfoOpen={isInfoOpen}
        onAddToCart={handleAddToCart}
        onZoom={(i) => setLightbox({open: true, index: i})}
      />
      <MobileLayout
        view={view}
        currentColor={currentColor}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onSelectColor={changeColor}
        onSelectSize={setSelectedSize}
        onToggleInfo={() => setIsInfoOpen((v) => !v)}
        isInfoOpen={isInfoOpen}
        onAddToCart={handleAddToCart}
        onZoom={(i) => setLightbox({open: true, index: i})}
      />
      <ProductInfoPanel
        open={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        editorial={view.editorial}
      />
      <ImageLightbox
        open={lightbox.open}
        images={currentColor.images}
        index={lightbox.index}
        onClose={() => setLightbox({open: false, index: 0})}
        onIndexChange={(i) => setLightbox({open: true, index: i})}
      />
    </>
  )
}
