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
import ProductInfoPanel from '@/components/Product/shared/ProductInfoPanel'
import LookDesktopBar from './LookDesktopBar'
import LookSizeList from './LookSizeList'
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
  const [mSizesOpen, setMSizesOpen] = useState(false)
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
        price: opt.price,
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

  const price = (
    <LookPrice
      allSelected={allSelected}
      minTotal={view.minTotal}
      maxTotal={view.maxTotal}
      summedTotal={summedTotal}
      discountedTotal={discountedTotal}
      hasDiscount={hasDiscount}
      currency={view.currency}
    />
  )

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

      {/* Desktop: fixed bottom bar */}
      <div className={s.desktopOnly}>
        <LookDesktopBar
          view={view}
          selected={selected}
          onSelect={handleSelect}
          allSelected={allSelected}
          summedTotal={summedTotal}
          discountedTotal={discountedTotal}
          hasDiscount={hasDiscount}
          onAddToCart={handleAddToCart}
          isInfoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((o) => !o)}
        />
      </div>

      {/* Mobile: stacked flow */}
      <div className={s.mobileOnly}>
        <h1 className={s.mTitle}>{view.title}</h1>
        <div className={s.mPrice}>{price}</div>
        <p className={s.mMeta}>
          Complimentary gift wrapping
          <br />
          30-day returns
        </p>

        <button
          type="button"
          className={s.mAccordion}
          aria-expanded={mSizesOpen}
          onClick={() => setMSizesOpen((o) => !o)}
        >
          <span>Select Product and Sizes</span>
          <svg
            className={[s.mCaret, mSizesOpen ? s.mCaretOpen : ''].join(' ')}
            viewBox="0 0 10 6"
            fill="none"
            aria-hidden
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {mSizesOpen && (
          <>
            <LookSizeList components={view.components} selected={selected} onSelect={handleSelect} />
            <button
              type="button"
              className={s.mAddToCart}
              disabled={!allSelected}
              onClick={handleAddToCart}
            >
              {allSelected ? 'Add to cart' : 'Select all sizes'}
            </button>
          </>
        )}

        {view.hasEditorial && (
          <button
            type="button"
            className={s.mAccordion}
            aria-haspopup="dialog"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen(true)}
          >
            <span>Product Information</span>
            <svg className={s.mCaret} viewBox="0 0 10 6" fill="none" aria-hidden>
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className={s.relatedMobile}>
        <RelatedGrid products={relatedCards} currency={view.currency} />
      </div>

      <ProductInfoPanel
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        editorial={view.editorial}
      />

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
