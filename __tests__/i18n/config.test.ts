import {describe, it, expect, afterEach} from 'vitest'
import {LOCALES, DEFAULT_LOCALE, isLocale, isI18nEnabled} from '@/lib/i18n/config'

describe('i18n config', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_I18N_ES
  })

  it('declares en as default and lists both locales', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(LOCALES).toEqual(['en', 'es'])
  })

  it('isLocale guards valid codes', () => {
    expect(isLocale('es')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('isI18nEnabled is true only when env is exactly "true"', () => {
    expect(isI18nEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_I18N_ES = 'false'
    expect(isI18nEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_I18N_ES = 'true'
    expect(isI18nEnabled()).toBe(true)
  })
})
