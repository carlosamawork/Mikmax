import {describe, it, expect, afterEach} from 'vitest'
import {localeAlternates} from '@/utils/seoHelper'

describe('localeAlternates', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_I18N_ES
  })

  it('flag off: canonical only, no languages', () => {
    const a = localeAlternates('/products/x')
    expect(a.languages).toBeUndefined()
    expect(a.canonical.endsWith('/products/x')).toBe(true)
  })

  it('flag on: emits en + es alternates', () => {
    process.env.NEXT_PUBLIC_I18N_ES = 'true'
    const a = localeAlternates('/products/x')
    expect(a.languages!.en.endsWith('/products/x')).toBe(true)
    expect(a.languages!.es.endsWith('/es/products/x')).toBe(true)
  })
})
