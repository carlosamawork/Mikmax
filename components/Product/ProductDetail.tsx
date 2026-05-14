'use client'
import {useContext, useEffect, useState} from 'react'
import dynamic from 'next/dynamic'
import {usePathname, useRouter} from 'next/navigation'
import {findEquivalentSize, findVariant} from '@/lib/product/findEquivalentSize'
import {CartContext} from '@/context/shopContext'
import DesktopLayout from './Desktop/DesktopLayout'
import MobileLayout from './Mobile/MobileLayout'
import ProductInfoPanel from './shared/ProductInfoPanel'
import type {ProductView, ProductInitialState} from '@/types/product'

type CartItemInput = {
  store: {gid: string}
  size?: string
  color?: string
  price?: number
}
type ShopCtx = {
  addToCart?: (
    newItem: CartItemInput,
    quantity: number,
    productId: string,
    title: string,
    image: string | undefined,
  ) => Promise<void> | void
  setCartOpen?: (open: boolean) => void
}

const ImageLightbox = dynamic(() => import('./shared/ImageLightbox'), {ssr: false})

interface Props {
  view: ProductView
  initial: ProductInitialState
}

export default function ProductDetail({view, initial}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const shop = useContext<ShopCtx>(CartContext as unknown as React.Context<ShopCtx>)

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

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    root.classList.add('no-page-scrollbar')
    body.classList.add('no-page-scrollbar')
    return () => {
      root.classList.remove('no-page-scrollbar')
      body.classList.remove('no-page-scrollbar')
    }
  }, [])

  function changeColor(slug: string) {
    setSelectedColor(slug)
    setSelectedSize((prev) => findEquivalentSize(view, slug, prev))
  }

  const currentColor = view.colors.find((c) => c.slug === selectedColor) ?? view.colors[0]

  async function handleAddToCart() {
    const variant = findVariant(view, selectedColor, selectedSize)
    if (!variant) return
    const newItem: CartItemInput = {
      store: {gid: variant.variantId},
      size: selectedSize,
      color: currentColor.label,
      price: variant.price,
    }
    const image = currentColor.images[0]?.url
    if (typeof shop?.addToCart === 'function') {
      await shop.addToCart(newItem, 1, view.id, view.title, image)
      if (typeof shop.setCartOpen === 'function') {
        shop.setCartOpen(true)
      }
    }
  }

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
