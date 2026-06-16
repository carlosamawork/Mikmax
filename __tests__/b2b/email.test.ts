import {describe, it, expect} from 'vitest'
import {isCorporateEmail} from '@/lib/b2b/validation/email'

describe('isCorporateEmail', () => {
  it('false para dominios genéricos', () => {
    expect(isCorporateEmail('a@gmail.com')).toBe(false)
    expect(isCorporateEmail('a@hotmail.com')).toBe(false)
    expect(isCorporateEmail('a@yahoo.es')).toBe(false)
    expect(isCorporateEmail('a@outlook.com')).toBe(false)
    expect(isCorporateEmail('a@icloud.com')).toBe(false)
  })
  it('true para dominios corporativos', () => {
    expect(isCorporateEmail('buyer@mikmax.com')).toBe(true)
    expect(isCorporateEmail('compras@hotelria.es')).toBe(true)
  })
  it('insensible a mayúsculas y espacios', () => {
    expect(isCorporateEmail('  A@GMAIL.com ')).toBe(false)
  })
  it('false para email malformado', () => {
    expect(isCorporateEmail('noesunemail')).toBe(false)
  })
})
