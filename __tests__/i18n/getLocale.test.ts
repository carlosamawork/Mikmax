import {describe, it, expect, vi} from 'vitest'

const headersMock = vi.fn()
vi.mock('next/headers', () => ({headers: () => headersMock()}))

import {getLocale} from '@/lib/i18n/getLocale'

describe('getLocale', () => {
  it('returns es when x-locale header is es', async () => {
    headersMock.mockResolvedValue(new Map([['x-locale', 'es']]))
    expect(await getLocale()).toBe('es')
  })

  it('falls back to en when header missing', async () => {
    headersMock.mockResolvedValue(new Map())
    expect(await getLocale()).toBe('en')
  })

  it('falls back to en when header invalid', async () => {
    headersMock.mockResolvedValue(new Map([['x-locale', 'fr']]))
    expect(await getLocale()).toBe('en')
  })
})
