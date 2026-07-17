import {describe, it, expect, vi} from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {...actual, cache: (fn: unknown) => fn}
})
import {discountedPrice, applyDiscountToCard} from '@/lib/b2b/pricing'

describe('discountedPrice', () => {
  it('aplica el % y redondea a 2 decimales', () => {
    expect(discountedPrice(100, 50)).toBe(50)
    expect(discountedPrice(99.9, 50)).toBe(49.95)
    expect(discountedPrice(100, 0)).toBe(100)
  })
  it('clamps percent fuera de rango [0,100]', () => {
    expect(discountedPrice(100, -10)).toBe(100)
    expect(discountedPrice(100, 150)).toBe(0)
  })
})

describe('applyDiscountToCard', () => {
  it('percent 0 → card sin cambios', () => {
    const card = {minPrice: 100, maxPrice: 200, compareAtPrice: undefined}
    expect(applyDiscountToCard(card, 0)).toEqual(card)
  })
  it('descuento → min/max descontados y compareAt = min original', () => {
    const out = applyDiscountToCard({minPrice: 100, maxPrice: 200}, 50)
    expect(out.minPrice).toBe(50)
    expect(out.maxPrice).toBe(100)
    expect(out.compareAtPrice).toBe(100)
  })
  it('sin minPrice numérico → sin cambios', () => {
    const card = {minPrice: undefined as unknown as number}
    expect(applyDiscountToCard(card, 50)).toEqual(card)
  })
})
