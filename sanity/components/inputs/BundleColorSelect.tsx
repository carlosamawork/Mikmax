import {useEffect, useState} from 'react'
import {StringInputProps, useFormValue, useClient, set, unset} from 'sanity'
import {Select, Spinner} from '@sanity/ui'
import {SANITY_API_VERSION} from '../../constants'

type ShopifyOption = {name?: string; values?: string[]}

/**
 * Color dropdown for a `bundleComponent`. Unlike `ProductColorSelect` (which
 * reads the root product document), here the product is a *reference* on the
 * sibling `product` field, so we resolve its `store.options` asynchronously and
 * list the values of the option named "Color".
 */
export default function BundleColorSelect(props: StringInputProps) {
  const {path, value, onChange} = props
  const productRef = useFormValue([...path.slice(0, -1), 'product']) as
    | {_ref?: string}
    | undefined
  const ref = productRef?._ref
  const client = useClient({apiVersion: SANITY_API_VERSION})

  const [colors, setColors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ref) {
      setColors([])
      return
    }
    let active = true
    setLoading(true)
    client
      .fetch<ShopifyOption[] | null>(`*[_id == $ref][0].store.options`, {ref})
      .then((opts) => {
        if (!active) return
        const color = (opts ?? []).find((o) => (o?.name ?? '').toLowerCase() === 'color')
        setColors(Array.isArray(color?.values) ? (color!.values as string[]) : [])
      })
      .catch(() => {
        if (active) setColors([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [ref, client])

  if (loading) return <Spinner muted />

  const current = value ?? ''
  const valueIsKnown = !current || colors.includes(current)

  return (
    <Select
      value={current}
      disabled={!ref || colors.length === 0}
      onChange={(event) => {
        const next = event.currentTarget.value
        onChange(next ? set(next) : unset())
      }}
    >
      <option value="">
        {!ref
          ? 'Selecciona un producto primero'
          : colors.length === 0
            ? 'Este producto no tiene opción "Color"'
            : '— Selecciona un color —'}
      </option>
      {!valueIsKnown && current && (
        <option value={current}>{current} (no coincide con el producto)</option>
      )}
      {colors.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  )
}
