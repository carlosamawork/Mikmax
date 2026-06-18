import {describe, it, expect} from 'vitest'
import {shopifyLanguage, DEFAULT_COUNTRY} from '@/lib/i18n/shopifyLocale'

describe('shopifyLocale', () => {
  it('maps locale to Shopify language code', () => {
    expect(shopifyLanguage('en')).toBe('EN')
    expect(shopifyLanguage('es')).toBe('ES')
  })

  it('exposes a default country for @inContext', () => {
    expect(typeof DEFAULT_COUNTRY).toBe('string')
    expect(DEFAULT_COUNTRY.length).toBe(2)
  })
})
