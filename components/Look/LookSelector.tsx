'use client'

import {useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {LookComponentView} from '@/types/look'
import s from './LookSelector.module.scss'

interface Props {
  components: LookComponentView[]
  selected: (string | undefined)[]
  onSelect: (componentIndex: number, size: string) => void
  allSelected: boolean
  onAddToCart: () => void
}

export default function LookSelector({
  components,
  selected,
  onSelect,
  allSelected,
  onAddToCart,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className={s.selector}>
      <button
        type="button"
        className={s.toggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Select products and sizes
      </button>

      {open && (
        <div className={s.panel}>
          {components.map((comp, i) => (
            <div key={i} className={s.piece}>
              <div className={s.pieceHead}>
                <span className={s.pieceIndex}>{i + 1}</span>
                {comp.imageUrl && (
                  <LazyImage
                    src={comp.imageUrl}
                    alt={comp.label}
                    width={64}
                    height={84}
                    className={s.pieceThumb}
                  />
                )}
                <span className={s.pieceLabel}>{comp.label}</span>
              </div>

              <ul className={s.sizes}>
                {comp.sizes.map((opt) => {
                  const isSelected = selected[i] === opt.size
                  return (
                    <li key={opt.variantGid} className={s.sizeRow}>
                      <span className={s.sizeName}>{opt.size}</span>
                      <span className={s.sizePrice}>€{opt.price.toFixed(2)}</span>
                      <button
                        type="button"
                        className={`${s.sizeSelect} ${isSelected ? s.sizeSelectActive : ''}`}
                        disabled={!opt.availableForSale}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(i, opt.size)}
                      >
                        {opt.availableForSale ? (isSelected ? 'Selected' : 'Select') : 'Sold out'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <button
            type="button"
            className={s.addToCart}
            disabled={!allSelected}
            onClick={onAddToCart}
          >
            {allSelected ? 'Add look to cart' : 'Select products and sizes'}
          </button>
        </div>
      )}
    </section>
  )
}
