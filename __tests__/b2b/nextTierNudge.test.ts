import {describe, it, expect} from 'vitest'
import {nextTierNudge} from '@/lib/b2b/cartCost'

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
  {minSubtotal: 10000, percent: 30},
]

describe('nextTierNudge', () => {
  it('devuelve gap y percent del siguiente tramo', () => {
    expect(nextTierNudge(500, TIERS)).toEqual({gap: 500, percent: 20})
    expect(nextTierNudge(1500, TIERS)).toEqual({gap: 8500, percent: 30})
  })
  it('en el borde apunta al siguiente', () => {
    expect(nextTierNudge(1000, TIERS)).toEqual({gap: 9000, percent: 30})
  })
  it('en el tramo máximo devuelve null', () => {
    expect(nextTierNudge(10000, TIERS)).toBeNull()
    expect(nextTierNudge(50000, TIERS)).toBeNull()
  })
  it('sin tramos devuelve null', () => {
    expect(nextTierNudge(500, [])).toBeNull()
  })
})
