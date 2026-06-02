'use client'
import type {ProductColor} from '@/types/product'
import s from './ColorSwatches.module.scss'

interface Props {
  colors: ProductColor[]
  selected: string
  onSelect: (slug: string) => void
  className?: string
  // Notifica el color bajo el cursor/foco (o null al salir), para mostrar su
  // nombre fuera del componente.
  onHover?: (slug: string | null) => void
}

export default function ColorSwatches({colors, selected, onSelect, className, onHover}: Props) {
  return (
    <div
      className={[s.row, className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label="Color"
      onMouseLeave={() => onHover?.(null)}
    >
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
            onMouseEnter={() => onHover?.(c.slug)}
            onFocus={() => onHover?.(c.slug)}
            onBlur={() => onHover?.(null)}
          >
            <span className={s.color} style={{backgroundColor: c.hex}} />
            <span className={[s.bar, isSelected ? s.barSelected : ''].join(' ')} />
          </button>
        )
      })}
    </div>
  )
}
