import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest'
import {checkCompaniesHouse} from '@/lib/b2b/validation/companiesHouse'

beforeEach(() => {
  process.env.COMPANIES_HOUSE_API_KEY = 'test-key'
})
afterEach(() => vi.restoreAllMocks())

describe('checkCompaniesHouse', () => {
  it('valid cuando la empresa existe y está activa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({company_status: 'active', company_name: 'ACME LTD'}),
    })))
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: true, available: true, name: 'ACME LTD'})
  })

  it('invalid si la empresa no está activa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({company_status: 'dissolved', company_name: 'OLD LTD'}),
    })))
    const r = await checkCompaniesHouse('GB99999999')
    expect(r.valid).toBe(false)
    expect(r.available).toBe(true)
  })

  it('invalid + available si responde 404 (no existe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 404, json: async () => ({})})))
    const r = await checkCompaniesHouse('GB00000000')
    expect(r).toEqual({valid: false, available: true})
  })

  it('neutro (available:false) sin API key', async () => {
    delete process.env.COMPANIES_HOUSE_API_KEY
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: false, available: false})
  })

  it('neutro (available:false) si fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network')
    }))
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: false, available: false})
  })
})
