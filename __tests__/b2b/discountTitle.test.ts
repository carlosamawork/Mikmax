import {describe, it, expect} from 'vitest'
import {professionalDiscountPercent} from '@/lib/b2b/cartCost'
import {localeFromPathname} from '@/lib/i18n/localizedHref'

describe('professionalDiscountPercent', () => {
  it('extrae el % del título en inglés (formato nuevo de la Function)', () => {
    expect(professionalDiscountPercent('Professional discount 30%')).toBe(30)
    expect(professionalDiscountPercent('Professional discount 5%')).toBe(5)
  })
  it('extrae el % del título en español (Function con locale es o legacy)', () => {
    expect(professionalDiscountPercent('Descuento profesional 30%')).toBe(30)
  })
  it('títulos ajenos (códigos de look, otros) -> null', () => {
    expect(professionalDiscountPercent('LOOK10')).toBeNull()
    expect(professionalDiscountPercent('Descuento mayorista 50%')).toBeNull()
    expect(professionalDiscountPercent(null)).toBeNull()
    expect(professionalDiscountPercent('')).toBeNull()
  })
})

describe('localeFromPathname', () => {
  it('rutas /es -> es', () => {
    expect(localeFromPathname('/es')).toBe('es')
    expect(localeFromPathname('/es/products/funda')).toBe('es')
  })
  it('resto -> en (incluida una ruta que empieza por "es" sin barra)', () => {
    expect(localeFromPathname('/')).toBe('en')
    expect(localeFromPathname('/products/funda')).toBe('en')
    expect(localeFromPathname('/essentials')).toBe('en')
  })
})
