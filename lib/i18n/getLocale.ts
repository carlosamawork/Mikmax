import {headers} from 'next/headers'
import {DEFAULT_LOCALE, isLocale, type Locale} from './config'

export async function getLocale(): Promise<Locale> {
  const h = await headers()
  const value = h.get('x-locale')
  return value && isLocale(value) ? value : DEFAULT_LOCALE
}
