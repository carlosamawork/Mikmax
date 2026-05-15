import {useMemo} from 'react'
import {StringInputProps, useFormValue, SanityDocument, set, unset} from 'sanity'
import {Select} from '@sanity/ui'

type ShopifyOption = {name?: string; values?: string[]}

type ProductDoc = SanityDocument & {
  store?: {options?: ShopifyOption[]}
}

/**
 * Custom string input for the `color` field inside a `relatedColorGroup`.
 * Reads the parent product's `store.options` (synced from Shopify) and lists
 * the values of the option named "Color" as a dropdown. Avoids typos and
 * keeps the schema decoupled from a hardcoded color list.
 */
export default function ProductColorSelect(props: StringInputProps) {
  const doc = useFormValue([]) as ProductDoc | undefined

  const colors = useMemo<string[]>(() => {
    const opts = doc?.store?.options ?? []
    const color = opts.find((o) => (o?.name ?? '').toLowerCase() === 'color')
    return Array.isArray(color?.values) ? (color!.values as string[]) : []
  }, [doc])

  const value = props.value ?? ''
  const valueIsKnown = !value || colors.includes(value)

  return (
    <Select
      value={value}
      onChange={(event) => {
        const next = event.currentTarget.value
        props.onChange(next ? set(next) : unset())
      }}
      disabled={colors.length === 0}
    >
      <option value="">
        {colors.length === 0
          ? 'Este producto no tiene opción "Color"'
          : '— Selecciona un color —'}
      </option>
      {!valueIsKnown && value && (
        <option value={value}>{value} (no coincide con ninguna variante)</option>
      )}
      {colors.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  )
}
