'use client'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {FilterDefinition, ShopSearchParams, SortKey} from '@/types/shop'
import {serializeSearchParams} from '@/lib/shop/searchParams'
import {getFilterCount as defaultCountAction} from '@/app/(frontend)/shop/actions'
import FilterAccordion from './FilterAccordion'
import SortRadios from './SortRadios'
import ColorSwatches from './ColorSwatches'
import SizeChips from './SizeChips'
import MaterialChips from './MaterialChips'
import {getMaterialFacetValues} from '@/lib/shop/materialFilter'
import PriceRange from './PriceRange'
import s from './FilterDrawer.module.scss'

const FACET_ID = {
  productType: 'filter.p.product_type',
  color: 'filter.v.t.shopify.color-pattern',
  size: 'filter.v.option.size',
  pattern: 'filter.v.option.pattern',
}

interface Props {
  handle: string
  open: boolean
  facets: FilterDefinition[]
  defaults: ShopSearchParams
  initialCount: number
  countAction?: (args: {handle: string; params: ShopSearchParams}) => Promise<number>
  sortOptions?: SortKey[]
  defaultSort?: SortKey
}

export default function FilterDrawer({
  handle,
  open,
  facets,
  defaults,
  initialCount,
  countAction = defaultCountAction,
  sortOptions,
  defaultSort = 'featured',
}: Props) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  const [state, setState] = useState<ShopSearchParams>(defaults)
  const [accordion, setAccordion] = useState<string | null>(null)
  const [count, setCount] = useState(initialCount)
  const lastFetch = useRef(0)

  // Reset local state when drawer opens
  useEffect(() => {
    if (open) {
      setState(defaults)
      setCount(initialCount)
    }
  }, [open, defaults, initialCount])

  // Scroll lock + ESC
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function close() {
      const next = new URLSearchParams(params.toString())
      next.delete('filters')
      const q = next.toString()
      router.push(q ? `${path}?${q}` : path, {scroll: false})
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, params, router, path])

  // Debounced count refresh
  useEffect(() => {
    if (!open) return
    const id = ++lastFetch.current
    const t = setTimeout(() => {
      countAction({handle, params: state}).then((n) => {
        if (id === lastFetch.current) setCount(n)
      })
    }, 250)
    return () => clearTimeout(t)
  }, [state, open, handle, countAction])

  function toggleAccordion(id: string) {
    setAccordion((cur) => (cur === id ? null : id))
  }

  function setSort(sort: SortKey) {
    setState((s) => ({...s, sort: sort === defaultSort ? undefined : sort}))
  }

  function toggleListValue(
    key: 'productType' | 'color' | 'size' | 'pattern' | 'material',
    kebab: string,
  ) {
    setState((s) => {
      const current = (s[key] ?? '').split(',').filter(Boolean)
      const idx = current.indexOf(kebab)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(kebab)
      return {...s, [key]: current.length ? current.join(',') : undefined}
    })
  }

  function setPrice(next: {min?: string; max?: string}) {
    setState((s) => ({...s, priceMin: next.min, priceMax: next.max}))
  }

  function clearAll() {
    setState({view: defaults.view, filters: 'open', q: defaults.q})
  }

  function closeFromButton() {
    const next = new URLSearchParams(params.toString())
    next.delete('filters')
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  function apply() {
    const stripped: ShopSearchParams = {...state}
    delete stripped.filters
    router.push(`${path}${serializeSearchParams(stripped)}`, {scroll: false})
  }

  const selected = useMemo(
    () => ({
      productType: (state.productType ?? '').split(',').filter(Boolean),
      color: (state.color ?? '').split(',').filter(Boolean),
      size: (state.size ?? '').split(',').filter(Boolean),
      pattern: (state.pattern ?? '').split(',').filter(Boolean),
      material: (state.material ?? '').split(',').filter(Boolean),
    }),
    [state],
  )

  const hasFilters = useMemo(
    () =>
      Boolean(
        state.productType ||
          state.color ||
          state.size ||
          state.pattern ||
          state.material ||
          state.priceMin ||
          state.priceMax ||
          state.available ||
          (state.sort && state.sort !== defaultSort),
      ),
    [state, defaultSort],
  )

  const facet = (id: string) => facets.find((f) => f.id === id)
  const materialValues = useMemo(() => getMaterialFacetValues(facets), [facets])

  if (!open) return null

  return (
    <>
      <div className={s.backdrop} onClick={closeFromButton} aria-hidden="true" />
      <aside className={s.aside} role="dialog" aria-modal="true" aria-label="Filter & Sort">
        <button type="button" className={s.close} onClick={closeFromButton} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 1 13 13M13 1 1 13" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <div className={s.header}>
          <h2>Filter &amp; Sort</h2>
          {hasFilters && (
            <button type="button" onClick={clearAll} className={s.clear}>
              Clear filters
            </button>
          )}
        </div>
        <div className={s.body}>
          <FilterAccordion
            id="sort"
            title="Sort"
            open={accordion === 'sort'}
            onToggle={toggleAccordion}
          >
            <SortRadios value={state.sort ?? defaultSort} onChange={setSort} options={sortOptions} />
          </FilterAccordion>

          {facet(FACET_ID.size) && (
            <FilterAccordion
              id="size"
              title="Size"
              open={accordion === 'size'}
              onToggle={toggleAccordion}
            >
              <SizeChips
                values={facet(FACET_ID.size)!.values}
                selected={selected.size}
                onToggle={(v) => toggleListValue('size', v)}
              />
            </FilterAccordion>
          )}

          {facet(FACET_ID.color) && (
            <FilterAccordion
              id="color"
              title="Color"
              open={accordion === 'color'}
              onToggle={toggleAccordion}
            >
              <ColorSwatches
                values={facet(FACET_ID.color)!.values}
                selected={selected.color}
                onToggle={(v) => toggleListValue('color', v)}
              />
            </FilterAccordion>
          )}

          {materialValues.length > 0 && (
            <FilterAccordion
              id="material"
              title="Materials"
              open={accordion === 'material'}
              onToggle={toggleAccordion}
            >
              <MaterialChips
                values={materialValues}
                selected={selected.material}
                onToggle={(v) => toggleListValue('material', v)}
              />
            </FilterAccordion>
          )}

          <FilterAccordion
            id="price"
            title="Price"
            open={accordion === 'price'}
            onToggle={toggleAccordion}
          >
            <PriceRange min={state.priceMin} max={state.priceMax} onChange={setPrice} />
          </FilterAccordion>
        </div>
        <div className={s.footer}>
          <button type="button" onClick={apply} className={s.primary}>
            View Products {count}
          </button>
        </div>
      </aside>
    </>
  )
}
