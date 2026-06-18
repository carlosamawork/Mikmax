import {describe, it, expect, afterEach} from 'vitest'
import {NextRequest} from 'next/server'
import {middleware} from '@/middleware'

function req(path: string, {al, cookie}: {al?: string; cookie?: string} = {}) {
  const headers = new Headers()
  if (al) headers.set('accept-language', al)
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest(new URL(`https://m.test${path}`), {headers})
}

describe('middleware', () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_I18N_ES)

  it('flag off: en header, no redirect on plain path', () => {
    const res = middleware(req('/products/x'))
    expect(res.headers.get('x-middleware-request-x-locale')).toBe('en')
    expect(res.headers.get('location')).toBeNull()
  })

  it('flag off: /es path redirects to de-prefixed', () => {
    const res = middleware(req('/es/products/x'))
    expect(res.headers.get('location')).toContain('/products/x')
  })

  it('flag on: /es path sets es locale (rewrite, no redirect)', () => {
    process.env.NEXT_PUBLIC_I18N_ES = 'true'
    const res = middleware(req('/es/products/x'))
    expect(res.headers.get('x-middleware-request-x-locale')).toBe('es')
    expect(res.headers.get('location')).toBeNull()
  })

  it('flag on: spanish browser, no cookie, redirects to /es', () => {
    process.env.NEXT_PUBLIC_I18N_ES = 'true'
    const res = middleware(req('/products/x', {al: 'es-ES,es;q=0.9'}))
    expect(res.headers.get('location')).toContain('/es/products/x')
  })

  it('flag on: cookie en overrides spanish browser', () => {
    process.env.NEXT_PUBLIC_I18N_ES = 'true'
    const res = middleware(req('/products/x', {al: 'es-ES', cookie: 'NEXT_LOCALE=en'}))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-request-x-locale')).toBe('en')
  })
})
