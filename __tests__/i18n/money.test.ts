import {describe, it, expect} from 'vitest'
import {formatMoney} from '@/lib/money'

describe('formatMoney', () => {
  it('formats EUR amount in es locale', () => {
    const result = formatMoney({amount: 29.99, currencyCode: 'EUR'}, 'es')
    // es-ES formats EUR with € symbol and European decimal/thousands separators
    expect(result).toContain('€')
    expect(result).toContain('29')
  })

  it('formats EUR amount in en locale', () => {
    const result = formatMoney({amount: 29.99, currencyCode: 'EUR'}, 'en')
    // en-US formats EUR with € symbol and US decimal separators
    expect(result).toContain('€')
    expect(result).toContain('29.99')
  })

  it('formats USD with its own symbol (non-EUR currency)', () => {
    const result = formatMoney({amount: 49.5, currencyCode: 'USD'}, 'en')
    expect(result).toContain('$')
    expect(result).toContain('49')
    expect(result).not.toContain('EUR')
  })

  it('formats GBP with pound symbol', () => {
    const result = formatMoney({amount: 100, currencyCode: 'GBP'}, 'en')
    expect(result).toContain('£')
    expect(result).toContain('100')
  })

  it('parses string amount correctly', () => {
    const resultStr = formatMoney({amount: '29.99', currencyCode: 'EUR'}, 'en')
    const resultNum = formatMoney({amount: 29.99, currencyCode: 'EUR'}, 'en')
    expect(resultStr).toBe(resultNum)
  })

  it('formats zero correctly', () => {
    const result = formatMoney({amount: 0, currencyCode: 'EUR'}, 'es')
    expect(result).toContain('0')
  })
})
