import type {Locale} from './config'
import en from './dictionaries/en.json'
import es from './dictionaries/es.json'

export type Dictionary = typeof en

const dictionaries: Record<Locale, Dictionary> = {en, es}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
