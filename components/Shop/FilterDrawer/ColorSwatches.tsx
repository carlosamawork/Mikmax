'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

const COLOR_MAP: Record<string, string> = {
  beige: '#e6d5b8',
  blue: '#7aa1c4',
  green: '#9ab68e',
  pink: '#e2bcb7',
  black: '#111',
  white: '#fff',
  grey: '#aaa',
  gray: '#aaa',
  brown: '#8b6b53',
}

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function ColorSwatches({values, selected, onToggle}: Props) {
  return (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        const bg = COLOR_MAP[key] ?? 'transparent'
        return (
          <li key={v.id}>
            <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(key)}
                style={{display: 'none'}}
                disabled={v.count === 0 && !checked}
              />
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: bg,
                  border: '1px solid #c4c4c4',
                  outline: checked ? '2px solid #111' : 'none',
                  outlineOffset: 2,
                  display: 'inline-block',
                }}
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
