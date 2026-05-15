'use client'
import GalleryHorizontal from './GalleryHorizontal'
import DesktopToolbar from './DesktopToolbar'
import type {ProductView, ProductColor} from '@/types/product'
import s from './DesktopLayout.module.scss'

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

export default function DesktopLayout(props: Props) {
  return (
    <div className={s.layout}>
      <GalleryHorizontal
        images={props.currentColor.images}
        related={props.currentColor.related ?? props.view.related}
        currency={props.view.currency}
        onZoom={props.onZoom}
      />
      <DesktopToolbar
        view={props.view}
        currentColor={props.currentColor}
        selectedColor={props.selectedColor}
        selectedSize={props.selectedSize}
        onSelectColor={props.onSelectColor}
        onSelectSize={props.onSelectSize}
        onToggleInfo={props.onToggleInfo}
        isInfoOpen={props.isInfoOpen}
        onAddToCart={props.onAddToCart}
      />
    </div>
  )
}
