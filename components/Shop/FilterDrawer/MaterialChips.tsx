'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'
import FilterOptionGrid from './FilterOptionGrid'

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function MaterialChips({values, selected, onToggle}: Props) {
  return (
    <FilterOptionGrid
      ariaLabel="Materials"
      options={values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return {
          key,
          label: v.label,
          selected: checked,
          disabled: v.count === 0 && !checked,
        }
      })}
      onSelect={onToggle}
    />
  )
}
