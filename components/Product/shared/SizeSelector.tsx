'use client'
import {useState} from 'react'
import type {ColorSize} from '@/types/product'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import {formatMoney} from '@/lib/money'
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
  copy: Pick<Dictionary['pdp'], 'sizeLabel' | 'selectSizePlaceholder' | 'selectSize'>
}

export default function SizeSelector({
  sizes,
  selected,
  currency,
  onSelect,
  className,
  productSubtitle,
  hideLabel = false,
  widePanel = false,
  copy,
}: Props) {
  const [open, setOpen] = useState(false)
  const current = selected ? sizes.find((sz) => sz.label === selected) : undefined

  // Client component: locale flag is OFF in production so 'en' is correct today.
  // Locale-threading is deferred to a later pass.
  const fmt = (n: number) =>
    formatMoney({amount: n, currencyCode: currency}, 'en', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })

  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {!hideLabel && <span className={s.label}>{copy.sizeLabel}</span>}
        {current ? (
          <>
            <span className={s.value}>{current.label}</span>
            <span className={s.price}>
              {current.displayPrice !== undefined && current.displayPrice < current.price && (
                <s style={{opacity: 0.5, marginRight: 6}}>{fmt(current.price)}</s>
              )}
              {fmt(current.displayPrice ?? current.price)}
            </span>
          </>
        ) : (
          <span className={s.placeholder}>{copy.selectSizePlaceholder}</span>
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
                {sz.displayPrice !== undefined && sz.displayPrice < sz.price && (
                  <s style={{opacity: 0.5, marginRight: 6}}>{fmt(sz.price)}</s>
                )}
                {fmt(sz.displayPrice ?? sz.price)}
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
                {copy.selectSize}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
