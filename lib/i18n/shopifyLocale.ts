import type {Locale} from './config'

export const DEFAULT_COUNTRY = 'ES'

export function shopifyLanguage(locale: Locale): 'EN' | 'ES' {
  return locale === 'es' ? 'ES' : 'EN'
}
