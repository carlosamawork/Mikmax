'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function CheckboxList({values, selected, onToggle}: Props) {
  return (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return (
          <li key={v.id}>
            <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(key)}
                disabled={v.count === 0 && !checked}
              />
              <span>{v.label}</span>
              <span style={{color: '#9ca3af', marginLeft: 'auto', fontSize: 11}}>{v.count}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
