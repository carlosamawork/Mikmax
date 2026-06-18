import {describe, it, expect} from 'vitest'
import {localizedHref} from '@/lib/i18n/localizedHref'

describe('localizedHref', () => {
  it('leaves en paths untouched', () => {
    expect(localizedHref('/products/x', 'en')).toBe('/products/x')
  })

  it('prefixes es paths with /es', () => {
    expect(localizedHref('/products/x', 'es')).toBe('/es/products/x')
  })

  it('maps root for es', () => {
    expect(localizedHref('/', 'es')).toBe('/es')
  })

  it('is idempotent for es', () => {
    expect(localizedHref('/es/products/x', 'es')).toBe('/es/products/x')
  })
})
