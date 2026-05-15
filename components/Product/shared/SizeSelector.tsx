'use client'
import {useState} from 'react'
import type {ColorSize} from '@/types/product'
import s from './SizeSelector.module.scss'

interface Props {
  sizes: ColorSize[]
  selected: string | undefined
  currency: string
  onSelect: (label: string) => void
  className?: string
  productSubtitle?: string
  hideLabel?: boolean
  widePanel?: boolean
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
  hideLabel = false,
  widePanel = false,
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
        {!hideLabel && <span className={s.label}>Size:</span>}
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
        <svg
          className={[s.caret, open ? s.caretOpen : ''].join(' ')}
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
      {open && (
        <div
          className={[s.panel, widePanel ? s.panelWide : ''].filter(Boolean).join(' ')}
          role="listbox"
        >
          {productSubtitle && (
            <div className={s.subtitle}>
              <span className={s.subtitleIndex}>1</span>
              <span className={s.subtitleText}>{productSubtitle}</span>
            </div>
          )}
          {sizes.map((sz) => (
            <div
              key={sz.variantId}
              className={[
                s.row,
                !sz.availableForSale ? s.rowDisabled : '',
                selected === sz.label ? s.rowSelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={s.rowIndex} aria-hidden />
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
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
