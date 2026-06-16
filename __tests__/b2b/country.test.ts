import {describe, it, expect} from 'vitest'
import {countryMatchesVat, parseVatPrefix} from '@/lib/b2b/validation/country'

describe('parseVatPrefix', () => {
  it('extrae el prefijo de 2 letras en mayúsculas', () => {
    expect(parseVatPrefix('ESB12345678')).toBe('ES')
    expect(parseVatPrefix('  es b1234 ')).toBe('ES')
  })
  it('devuelve null si no empieza por dos letras', () => {
    expect(parseVatPrefix('12345678')).toBeNull()
  })
})

describe('countryMatchesVat', () => {
  it('true cuando el prefijo VAT corresponde al país', () => {
    expect(countryMatchesVat('ES', 'ESB12345678')).toBe(true)
  })
  it('mapea el prefijo griego EL a GR', () => {
    expect(countryMatchesVat('GR', 'EL123456789')).toBe(true)
  })
  it('mapea UK (prefijo GB) al país GB', () => {
    expect(countryMatchesVat('GB', 'GB123456789')).toBe(true)
  })
  it('false cuando no corresponden', () => {
    expect(countryMatchesVat('FR', 'ESB12345678')).toBe(false)
  })
  it('false cuando el VAT no tiene prefijo', () => {
    expect(countryMatchesVat('ES', '12345678')).toBe(false)
  })
})
