'use client'
import type {SortKey} from '@/types/shop'
import {SORT_LABELS} from '@/types/shop'
import FilterOptionGrid from './FilterOptionGrid'

interface Props {
  value: SortKey
  onChange: (next: SortKey) => void
  options?: SortKey[]
}

const ORDER: SortKey[] = ['featured', 'newest', 'best-selling', 'price-asc', 'price-desc']

export default function SortRadios({value, onChange, options}: Props) {
  const list = options ?? ORDER
  return (
    <FilterOptionGrid
      ariaLabel="Sort"
      options={list.map((sk) => ({
        key: sk,
        label: SORT_LABELS[sk],
        selected: value === sk,
      }))}
      onSelect={(k) => onChange(k as SortKey)}
    />
  )
}
