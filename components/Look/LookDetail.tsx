'use client'

import {useContext, useMemo, useState} from 'react'
import {CartContext} from '@/context/shopContext'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import type {LookView} from '@/types/look'
import type {ProductMiniCard} from '@/types/product'
import GalleryHorizontal from '@/components/Product/Desktop/GalleryHorizontal'
import GallerySwiper from '@/components/Product/Mobile/GallerySwiper'
import ImageLightbox from '@/components/Product/shared/ImageLightbox'
import RelatedGrid from '@/components/Product/Mobile/RelatedGrid'
import LookSelector from './LookSelector'
import LookPrice from './LookPrice'
import s from './LookDetail.module.scss'

interface Props {
  view: LookView
}

export default function LookDetail({view}: Props) {
  const {addLookToCart} = useContext(CartContext)
  const [selected, setSelected] = useState<(string | undefined)[]>(
    () => view.components.map(() => undefined),
  )
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)

  const allSelected =
    view.components.length > 0 && selected.every((sz) => sz !== undefined)

  const summedTotal = useMemo(
    () =>
      view.components.reduce((sum, comp, i) => {
        const opt = comp.sizes.find((o) => o.size === selected[i])
        return sum + (opt ? opt.price : 0)
      }, 0),
    [view.components, selected],
  )

  const discountedTotal = applyLookDiscount(summedTotal, view.discountStrategy, view.discountValue)
  const hasDiscount = view.discountStrategy !== 'none' && view.discountValue > 0

  const relatedCards: ProductMiniCard[] = view.related.map((r) => ({
    handle: r.handle,
    title: r.title,
    imageUrl: r.imageUrl,
    imageAlt: r.imageAlt,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
  }))

  function handleSelect(componentIndex: number, size: string) {
    setSelected((prev) => {
      const next = [...prev]
      next[componentIndex] = size
      return next
    })
  }

  async function handleAddToCart() {
    if (!allSelected) return
    const lines = view.components.map((comp, i) => {
      const opt = comp.sizes.find((o) => o.size === selected[i])!
      return {
        store: {gid: opt.variantGid},
        title: comp.label,
        image: comp.imageUrl,
        productId: opt.variantGid,
        quantity: 1,
      }
    })
    await addLookToCart(lines, view.discountCode)
  }

  function openZoom(i: number) {
    setLightboxIndex(i)
    setLightboxOpen(true)
  }

  return (
    <article className={s.look}>
      <div className={s.galleryDesktop}>
        <GalleryHorizontal
          images={view.images}
          related={relatedCards}
          currency={view.currency}
          onZoom={openZoom}
        />
      </div>
      <div className={s.galleryMobile}>
        <GallerySwiper images={view.images} onZoom={openZoom} />
      </div>

      <div className={s.body}>
        <h1 className={s.title}>{view.title}</h1>

        <LookPrice
          allSelected={allSelected}
          minTotal={view.minTotal}
          maxTotal={view.maxTotal}
          summedTotal={summedTotal}
          discountedTotal={discountedTotal}
          hasDiscount={hasDiscount}
          currency={view.currency}
        />

        <LookSelector
          components={view.components}
          selected={selected}
          onSelect={handleSelect}
          allSelected={allSelected}
          onAddToCart={handleAddToCart}
        />

        {view.description && (
          <section className={s.info}>
            <button
              type="button"
              className={s.infoToggle}
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((o) => !o)}
            >
              Product Information
            </button>
            {infoOpen && <div className={s.infoBody}>{view.description}</div>}
          </section>
        )}
      </div>

      <div className={s.relatedMobile}>
        <RelatedGrid products={relatedCards} currency={view.currency} />
      </div>

      <ImageLightbox
        open={lightboxOpen}
        images={view.images}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </article>
  )
}
