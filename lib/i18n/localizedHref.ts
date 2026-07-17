import type {Locale} from './config'

// Locale de una ruta ya localizada (mismo criterio que el middleware).
export function localeFromPathname(path: string): Locale {
  return path === '/es' || path.startsWith('/es/') ? 'es' : 'en'
}

export function localizedHref(path: string, locale: Locale): string {
  if (locale === 'en') return path
  if (path === '/') return '/es'
  if (path === '/es' || path.startsWith('/es/')) return path
  return `/es${path.startsWith('/') ? path : `/${path}`}`
}
