'use client'
import s from './FilterOptionGrid.module.scss'

export interface FilterOption {
  key: string
  label: string
  selected: boolean
  disabled?: boolean
}

interface Props {
  ariaLabel: string
  options: FilterOption[]
  onSelect: (key: string) => void
}

export default function FilterOptionGrid({ariaLabel, options, onSelect}: Props) {
  return (
    <div className={s.grid} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`${s.cell} ${o.selected ? s.cellSelected : ''}`}
          aria-pressed={o.selected}
          disabled={o.disabled}
          onClick={() => onSelect(o.key)}
        >
          <span className={s.box} aria-hidden="true" />
          <span className={s.label}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
