'use client'
import type {SortKey} from '@/types/shop'
import {SORT_LABELS} from '@/types/shop'

interface Props {
  value: SortKey
  onChange: (next: SortKey) => void
}

const ORDER: SortKey[] = ['featured', 'newest', 'best-selling', 'price-asc', 'price-desc']

export default function SortRadios({value, onChange}: Props) {
  return (
    <ul
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      {ORDER.map((sk) => (
        <li key={sk}>
          <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
            <input
              type="radio"
              name="sort"
              value={sk}
              checked={value === sk}
              onChange={() => onChange(sk)}
            />
            {SORT_LABELS[sk]}
          </label>
        </li>
      ))}
    </ul>
  )
}
