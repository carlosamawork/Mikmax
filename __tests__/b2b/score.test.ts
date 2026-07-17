import {describe, it, expect} from 'vitest'
import {scoreApplication} from '@/lib/b2b/validation/score'

const BASE = {
  vatValid: false,
  vatServiceAvailable: true,
  corporateEmail: false,
  websitePresent: false,
  countryMatchesVat: false,
  countryVerifiable: true,
}

describe('scoreApplication', () => {
  it('todo valido -> 100 approved', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.score).toBe(100)
    expect(r.decision).toBe('approved')
  })
  it('APPROVED exacto en 85 (VAT+email+web)', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
    })
    expect(r.score).toBe(85)
    expect(r.decision).toBe('approved')
  })
  it('REVIEW por debajo de 85 (VAT+email = 70)', () => {
    const r = scoreApplication({...BASE, vatValid: true, corporateEmail: true})
    expect(r.score).toBe(70)
    expect(r.decision).toBe('review')
  })
  it('REJECTED por debajo de 50 (solo VAT = 45)', () => {
    const r = scoreApplication({...BASE, vatValid: true})
    expect(r.score).toBe(45)
    expect(r.decision).toBe('rejected')
  })
  it('pais no verificable -> siempre review', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
      countryVerifiable: false,
    })
    expect(r.decision).toBe('review')
  })
})
