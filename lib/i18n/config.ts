export type Locale = 'en' | 'es'

export const LOCALES: Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value)
}

export function isI18nEnabled(): boolean {
  return process.env.NEXT_PUBLIC_I18N_ES === 'true'
}
