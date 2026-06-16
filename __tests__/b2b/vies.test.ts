import {describe, it, expect, vi, afterEach} from 'vitest'
import {checkVies} from '@/lib/b2b/validation/vies'

afterEach(() => vi.restoreAllMocks())

describe('checkVies', () => {
  it('valid + available cuando VIES dice valid:true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({valid: true, name: 'ACME SL', address: 'Calle 1'}),
    })))
    const r = await checkVies('ESB12345678')
    expect(r).toEqual({valid: true, available: true, name: 'ACME SL', address: 'Calle 1'})
  })

  it('invalid + available cuando VIES dice valid:false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({valid: false}),
    })))
    const r = await checkVies('ESB00000000')
    expect(r.valid).toBe(false)
    expect(r.available).toBe(true)
  })

  it('available:false (neutro) si el VAT no tiene prefijo parseable', async () => {
    const r = await checkVies('123')
    expect(r).toEqual({valid: false, available: false})
  })

  it('available:false (neutro) si fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network')
    }))
    const r = await checkVies('ESB12345678')
    expect(r).toEqual({valid: false, available: false})
  })

  it('available:false (neutro) si el servicio responde no-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 500, json: async () => ({})})))
    const r = await checkVies('ESB12345678')
    expect(r.available).toBe(false)
  })
})
