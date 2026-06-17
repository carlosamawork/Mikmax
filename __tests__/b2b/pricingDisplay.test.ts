import {describe, it, expect, vi} from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {...actual, cache: (fn: unknown) => fn}
})
import {parsePricingConfig, resellerPrice, applyResellerToCard} from '@/lib/b2b/pricing'

const CFG = {
  resellerPercent: 50,
  designerTiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
}

describe('parsePricingConfig', () => {
  it('parsea JSON válido', () => {
    expect(parsePricingConfig(JSON.stringify(CFG))).toEqual(CFG)
  })
  it('null/ inválido / incompleto → null', () => {
    expect(parsePricingConfig(null)).toBeNull()
    expect(parsePricingConfig('nope')).toBeNull()
    expect(parsePricingConfig('{}')).toBeNull()
    expect(parsePricingConfig(JSON.stringify({resellerPercent: 50}))).toBeNull()
  })
})

describe('resellerPrice', () => {
  it('aplica el % y redondea a 2 decimales', () => {
    expect(resellerPrice(100, 50)).toBe(50)
    expect(resellerPrice(99.9, 50)).toBe(49.95)
    expect(resellerPrice(100, 0)).toBe(100)
  })
  it('clamps percent fuera de rango [0,100]', () => {
    expect(resellerPrice(100, -10)).toBe(100)
    expect(resellerPrice(100, 150)).toBe(0)
  })
})

describe('applyResellerToCard', () => {
  it('percent 0 → card sin cambios', () => {
    const card = {minPrice: 100, maxPrice: 200, compareAtPrice: undefined}
    expect(applyResellerToCard(card, 0)).toEqual(card)
  })
  it('reseller → min/max descontados y compareAt = min original', () => {
    const out = applyResellerToCard({minPrice: 100, maxPrice: 200}, 50)
    expect(out.minPrice).toBe(50)
    expect(out.maxPrice).toBe(100)
    expect(out.compareAtPrice).toBe(100)
  })
  it('sin minPrice numérico → sin cambios', () => {
    const card = {minPrice: undefined as unknown as number}
    expect(applyResellerToCard(card, 50)).toEqual(card)
  })
})
