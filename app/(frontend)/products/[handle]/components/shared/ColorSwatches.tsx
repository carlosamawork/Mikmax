'use client'
import type {ProductColor} from '../../_types'
import s from './ColorSwatches.module.scss'

interface Props {
  colors: ProductColor[]
  selected: string
  onSelect: (slug: string) => void
  className?: string
}

export default function ColorSwatches({colors, selected, onSelect, className}: Props) {
  return (
    <div className={[s.row, className].filter(Boolean).join(' ')} role="radiogroup" aria-label="Color">
      {colors.map((c) => {
        const isSelected = c.slug === selected
        return (
          <button
            key={c.slug}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={c.label}
            className={s.swatch}
            onClick={() => onSelect(c.slug)}
          >
            <span className={s.color} style={{backgroundColor: c.hex}} />
            <span className={[s.bar, isSelected ? s.barSelected : ''].join(' ')} />
          </button>
        )
      })}
    </div>
  )
}
