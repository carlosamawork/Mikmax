import {describe, it, expect} from 'vitest'
import {parseDiscountSpec, tierPercent, displayPercent} from '@/lib/b2b/discountSpec'

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
  {minSubtotal: 10000, percent: 30},
]

describe('parseDiscountSpec', () => {
  it('parsea fixed y tiers', () => {
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed', percent: 50}))).toEqual({
      type: 'fixed',
      percent: 50,
    })
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: TIERS}))).toEqual({
      type: 'tiers',
      tiers: TIERS,
    })
  })
  it('mapea legacy {resellerPercent, designerTiers} a tiers', () => {
    expect(parseDiscountSpec(JSON.stringify({resellerPercent: 50, designerTiers: TIERS}))).toEqual({
      type: 'tiers',
      tiers: TIERS,
    })
  })
  it('invalido -> null', () => {
    expect(parseDiscountSpec(null)).toBeNull()
    expect(parseDiscountSpec('{}')).toBeNull()
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed'}))).toBeNull()
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: [{percent: 1}]}))).toBeNull()
  })
})

describe('tierPercent', () => {
  it('tramo mas alto alcanzado; vacio/no alcanzado -> 0', () => {
    expect(tierPercent(TIERS, 999)).toBe(15)
    expect(tierPercent(TIERS, 1000)).toBe(20)
    expect(tierPercent([], 500)).toBe(0)
    expect(tierPercent([{minSubtotal: 100, percent: 10}], 50)).toBe(0)
  })
})

describe('displayPercent', () => {
  it('fixed -> percent clamp; tiers/null -> 0', () => {
    expect(displayPercent({type: 'fixed', percent: 50})).toBe(50)
    expect(displayPercent({type: 'fixed', percent: 150})).toBe(100)
    expect(displayPercent({type: 'tiers', tiers: TIERS})).toBe(0)
    expect(displayPercent(null)).toBe(0)
  })
})
