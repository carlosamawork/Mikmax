'use client'
import GallerySwiper from './GallerySwiper'
import MobileToolbar from './MobileToolbar'
import RelatedGrid from './RelatedGrid'
import StickyCTA from './StickyCTA'
import type {ProductView, ProductColor} from '../../_types'
import s from './MobileLayout.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
  onAddToCart: () => void
  onZoom: (index: number) => void
}

export default function MobileLayout(props: Props) {
  const canAddToCart =
    !!props.selectedSize &&
    !!props.currentColor.sizes.find((sz) => sz.label === props.selectedSize)?.availableForSale
  return (
    <div className={s.layout}>
      <GallerySwiper images={props.currentColor.images} onZoom={props.onZoom} />
      <MobileToolbar
        view={props.view}
        currentColor={props.currentColor}
        selectedColor={props.selectedColor}
        selectedSize={props.selectedSize}
        onSelectColor={props.onSelectColor}
        onSelectSize={props.onSelectSize}
        onToggleInfo={props.onToggleInfo}
        isInfoOpen={props.isInfoOpen}
      />
      <RelatedGrid products={props.view.related} currency={props.view.currency} />
      <StickyCTA canAddToCart={canAddToCart} onAddToCart={props.onAddToCart} />
    </div>
  )
}
