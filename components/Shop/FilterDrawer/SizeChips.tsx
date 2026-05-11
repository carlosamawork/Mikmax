'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function SizeChips({values, selected, onToggle}: Props) {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onToggle(key)}
            disabled={v.count === 0 && !checked}
            style={{
              padding: '6px 10px',
              border: '1px solid #c4c4c4',
              background: checked ? '#111' : '#fff',
              color: checked ? '#fff' : '#111',
              cursor: v.count === 0 && !checked ? 'not-allowed' : 'pointer',
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            {v.label} <span style={{opacity: 0.6}}>({v.count})</span>
          </button>
        )
      })}
    </div>
  )
}
