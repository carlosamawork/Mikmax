import {NextRequest, NextResponse} from 'next/server'
import {DEFAULT_LOCALE, isI18nEnabled} from '@/lib/i18n/config'

function withLocale(req: NextRequest, locale: 'en' | 'es') {
  const h = new Headers(req.headers)
  h.set('x-locale', locale)
  return h
}

function setLocaleHeader(req: NextRequest, locale: 'en' | 'es') {
  return NextResponse.next({request: {headers: withLocale(req, locale)}})
}

function prefersSpanish(req: NextRequest): boolean {
  const al = req.headers.get('accept-language') ?? ''
  return al.toLowerCase().split(',')[0]?.trim().startsWith('es') ?? false
}

export function middleware(req: NextRequest) {
  const {pathname} = req.nextUrl
  const isEs = pathname === '/es' || pathname.startsWith('/es/')

  if (!isI18nEnabled()) {
    if (isEs) {
      const url = req.nextUrl.clone()
      url.pathname = pathname.replace(/^\/es/, '') || '/'
      return NextResponse.redirect(url)
    }
    return setLocaleHeader(req, DEFAULT_LOCALE)
  }

  if (isEs) {
    const url = req.nextUrl.clone()
    url.pathname = pathname.replace(/^\/es/, '') || '/'
    return NextResponse.rewrite(url, {request: {headers: withLocale(req, 'es')}})
  }

  const cookie = req.cookies.get('NEXT_LOCALE')?.value
  if (!cookie && prefersSpanish(req)) {
    const url = req.nextUrl.clone()
    url.pathname = `/es${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url, 308)
  }

  return setLocaleHeader(req, 'en')
}

export const config = {
  matcher: ['/((?!admin|api|_next|.*\\..*).*)'],
}
