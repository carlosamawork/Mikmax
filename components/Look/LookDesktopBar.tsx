'use client'

import {useState} from 'react'
import type {LookView} from '@/types/look'
import LookPrice from './LookPrice'
import LookSizeList from './LookSizeList'
import s from './LookDesktopBar.module.scss'

interface Props {
  view: LookView
  selected: (string | undefined)[]
  onSelect: (componentIndex: number, size: string) => void
  allSelected: boolean
  summedTotal: number
  discountedTotal: number
  hasDiscount: boolean
  onAddToCart: () => void
}

// Fixed bottom bar for the look detail page (desktop only), mirroring the PDP
// DesktopToolbar and Figma node 31-13569: title/price, a size-panel toggle,
// Product Information + delivery meta, and the add-to-cart CTA. The size panel
// and the info body expand above the bar.
export default function LookDesktopBar({
  view,
  selected,
  onSelect,
  allSelected,
  summedTotal,
  discountedTotal,
  hasDiscount,
  onAddToCart,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className={s.bar}>
      {panelOpen && (
        <div className={s.panel}>
          <LookSizeList components={view.components} selected={selected} onSelect={onSelect} />
        </div>
      )}
      {infoOpen && view.description && <div className={s.infoBody}>{view.description}</div>}

      <div className={s.colTitle}>
        <h1 className={s.title}>{view.title}</h1>
        <div className={s.price}>
          <LookPrice
            allSelected={allSelected}
            minTotal={view.minTotal}
            maxTotal={view.maxTotal}
            summedTotal={summedTotal}
            discountedTotal={discountedTotal}
            hasDiscount={hasDiscount}
            currency={view.currency}
          />
        </div>
      </div>

      <div className={s.colMid}>
        <button
          type="button"
          className={s.panelToggle}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <span>Select products and sizes</span>
          <span className={[s.caret, panelOpen ? s.caretOpen : ''].join(' ')} aria-hidden />
        </button>
        <div className={s.midBottom}>
          <button
            type="button"
            className={s.infoToggle}
            aria-expanded={infoOpen}
            disabled={!view.description}
            onClick={() => setInfoOpen((o) => !o)}
          >
            Product Information +
          </button>
          <div className={s.meta}>
            Complimentary gift wrapping
            <br />
            30-day returns
          </div>
        </div>
      </div>

      <button
        type="button"
        className={[s.cta, allSelected ? s.ctaActive : ''].join(' ')}
        disabled={!allSelected}
        onClick={onAddToCart}
      >
        {allSelected ? 'Add to cart' : 'Select products and sizes'}
      </button>
    </div>
  )
}
