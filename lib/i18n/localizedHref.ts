import type {Locale} from './config'

export function localizedHref(path: string, locale: Locale): string {
  if (locale === 'en') return path
  if (path === '/') return '/es'
  if (path === '/es' || path.startsWith('/es/')) return path
  return `/es${path.startsWith('/') ? path : `/${path}`}`
}
