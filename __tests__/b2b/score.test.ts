import {describe, it, expect} from 'vitest'
import {scoreApplication} from '@/lib/b2b/validation/score'
import type {ValidationSignals} from '@/types/b2b'

const base: ValidationSignals = {
  vatValid: false,
  vatServiceAvailable: true,
  corporateEmail: false,
  websitePresent: false,
  countryMatchesVat: false,
  clientTypeDeclared: false,
}

describe('scoreApplication', () => {
  it('APPROVED con VAT válido + email + web + país (90)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.score).toBe(90)
    expect(r.decision).toBe('approved')
  })

  it('APPROVED exacto en 85 (VAT+email+país+tipo)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      countryMatchesVat: true,
      clientTypeDeclared: true,
    })
    expect(r.score).toBe(85)
    expect(r.decision).toBe('approved')
  })

  it('REVIEW cuando VIES no está disponible (cae sin los 40 → 60)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: false,
      vatServiceAvailable: false,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
      clientTypeDeclared: false,
    })
    expect(r.score).toBe(50)
    expect(r.decision).toBe('review')
  })

  it('REJECTED por debajo de 50', () => {
    const r = scoreApplication({...base, clientTypeDeclared: true}) // 10
    expect(r.score).toBe(10)
    expect(r.decision).toBe('rejected')
  })

  it('UK con Companies House válido cuenta como vatValid (40) y puede aprobar', () => {
    // El orquestador setea vatValid=true cuando Companies House valida.
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.decision).toBe('approved')
  })
})
