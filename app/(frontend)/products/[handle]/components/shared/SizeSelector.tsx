'use client'
import {useState} from 'react'
import type {ColorSize} from '../../_types'
import s from './SizeSelector.module.scss'

interface Props {
  sizes: ColorSize[]
  selected: string | undefined
  currency: string
  onSelect: (label: string) => void
  className?: string
  productSubtitle?: string
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function SizeSelector({
  sizes,
  selected,
  currency,
  onSelect,
  className,
  productSubtitle,
}: Props) {
  const [open, setOpen] = useState(false)
  const current = selected ? sizes.find((sz) => sz.label === selected) : undefined

  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={s.label}>Size:</span>
        {current ? (
          <>
            <span className={s.value}>{current.label}</span>
            <span className={s.price}>
              {currency === 'EUR' ? FMT.format(current.price) : `${current.price} ${currency}`}
            </span>
          </>
        ) : (
          <span className={s.placeholder}>Please select a size</span>
        )}
        <span className={[s.caret, open ? s.caretOpen : ''].join(' ')} aria-hidden>▾</span>
      </button>
      {open && (
        <div className={s.panel} role="listbox">
          {productSubtitle && <div className={s.subtitle}>{productSubtitle}</div>}
          {sizes.map((sz) => (
            <div
              key={sz.variantId}
              className={[s.row, !sz.availableForSale ? s.rowDisabled : ''].join(' ')}
            >
              <span className={s.rowLabel}>{sz.label}</span>
              <span className={s.rowPrice}>
                {currency === 'EUR' ? FMT.format(sz.price) : `${sz.price} ${currency}`}
              </span>
              <button
                type="button"
                className={s.selectBtn}
                disabled={!sz.availableForSale}
                onClick={() => {
                  onSelect(sz.label)
                  setOpen(false)
                }}
              >
                {sz.availableForSale ? 'Select' : 'Sold out'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
