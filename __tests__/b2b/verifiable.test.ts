import {describe, it, expect} from 'vitest'
import {isVerifiableCountry, VERIFIABLE_COUNTRIES} from '@/lib/b2b/validation/vatPrefixes'

describe('isVerifiableCountry', () => {
  it('UE y UK son verificables', () => {
    expect(isVerifiableCountry('ES')).toBe(true)
    expect(isVerifiableCountry('gb')).toBe(true)
    expect(isVerifiableCountry('GR')).toBe(true)
    expect(isVerifiableCountry('DE')).toBe(true)
  })
  it('fuera de UE+UK no es verificable', () => {
    expect(isVerifiableCountry('US')).toBe(false)
    expect(isVerifiableCountry('CH')).toBe(false)
    expect(isVerifiableCountry('')).toBe(false)
  })
  it('VERIFIABLE_COUNTRIES incluye GB y GR, no US', () => {
    expect(VERIFIABLE_COUNTRIES.has('GB')).toBe(true)
    expect(VERIFIABLE_COUNTRIES.has('GR')).toBe(true)
    expect(VERIFIABLE_COUNTRIES.has('US')).toBe(false)
  })
})
