import {describe, it, expect, vi, beforeEach} from 'vitest'

// getEffectiveDiscountSpec/getDisplayPercent (lib/b2b/pricing.ts) usan React cache().
// Fuera de un render de Next, cache() de 'react' no es invocable en el entorno de test
// (mismo motivo que en pricingDisplay.test.ts): se shimea a identidad, con lo que además
// deja de memoizar entre llamadas dentro de un mismo test file — no hace falta
// vi.resetModules() para aislar tests.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {...actual, cache: (fn: unknown) => fn}
})

vi.mock('@/lib/auth/customer', () => ({getCurrentCustomer: vi.fn()}))
vi.mock('@/lib/shopify-admin', () => ({getShopB2bPricing: vi.fn()}))

import {getCurrentCustomer} from '@/lib/auth/customer'
import {getShopB2bPricing} from '@/lib/shopify-admin'
import {getEffectiveDiscountSpec} from '@/lib/b2b/pricing'
import {getB2bCartContext} from '@/app/(frontend)/cart/actions'
import type {Customer} from '@/types/account'

const mockGetCurrentCustomer = vi.mocked(getCurrentCustomer)
const mockGetShopB2bPricing = vi.mocked(getShopB2bPricing)

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
]

function customerSession(overrides: {validated?: string; discount?: string}) {
  const customer: Customer = {
    id: 'gid://shopify/Customer/1',
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    phone: null,
    b2bValidated: {value: overrides.validated ?? 'true'},
    b2bDiscount: overrides.discount === undefined ? undefined : {value: overrides.discount},
  }
  return {token: 'tok', customer}
}

beforeEach(() => {
  mockGetCurrentCustomer.mockReset()
  mockGetShopB2bPricing.mockReset()
})

describe('getEffectiveDiscountSpec', () => {
  it('override válido (fixed) gana sobre el default de tienda', async () => {
    mockGetCurrentCustomer.mockResolvedValue(
      customerSession({discount: JSON.stringify({type: 'fixed', percent: 25})}),
    )
    mockGetShopB2bPricing.mockResolvedValue(JSON.stringify({type: 'fixed', percent: 10}))

    const spec = await getEffectiveDiscountSpec()

    expect(spec).toEqual({type: 'fixed', percent: 25})
    expect(mockGetShopB2bPricing).not.toHaveBeenCalled()
  })

  it('override inválido (JSON corrupto) cae al default de tienda (legacy -> tiers)', async () => {
    mockGetCurrentCustomer.mockResolvedValue(customerSession({discount: '{not-json'}))
    mockGetShopB2bPricing.mockResolvedValue(
      JSON.stringify({resellerPercent: 50, designerTiers: TIERS}),
    )

    const spec = await getEffectiveDiscountSpec()

    expect(spec).toEqual({type: 'tiers', tiers: TIERS})
  })

  it('cliente no validado -> null aunque haya override', async () => {
    mockGetCurrentCustomer.mockResolvedValue(
      customerSession({
        validated: 'false',
        discount: JSON.stringify({type: 'fixed', percent: 25}),
      }),
    )
    mockGetShopB2bPricing.mockResolvedValue(JSON.stringify({type: 'fixed', percent: 10}))

    const spec = await getEffectiveDiscountSpec()

    expect(spec).toBeNull()
    expect(mockGetShopB2bPricing).not.toHaveBeenCalled()
  })

  it('sin sesión -> null', async () => {
    mockGetCurrentCustomer.mockResolvedValue(null)

    const spec = await getEffectiveDiscountSpec()

    expect(spec).toBeNull()
    expect(mockGetShopB2bPricing).not.toHaveBeenCalled()
  })
})

describe('getB2bCartContext', () => {
  it('spec por tramos -> hasTiers true con los tramos del override', async () => {
    mockGetCurrentCustomer.mockResolvedValue(
      customerSession({discount: JSON.stringify({type: 'tiers', tiers: TIERS})}),
    )
    mockGetShopB2bPricing.mockResolvedValue(null)

    const ctx = await getB2bCartContext()

    expect(ctx).toEqual({hasTiers: true, tiers: TIERS})
  })

  it('spec fijo -> hasTiers false, tiers vacío', async () => {
    mockGetCurrentCustomer.mockResolvedValue(
      customerSession({discount: JSON.stringify({type: 'fixed', percent: 25})}),
    )
    mockGetShopB2bPricing.mockResolvedValue(null)

    const ctx = await getB2bCartContext()

    expect(ctx).toEqual({hasTiers: false, tiers: []})
  })

  it('sin sesión -> hasTiers false, tiers vacío', async () => {
    mockGetCurrentCustomer.mockResolvedValue(null)

    const ctx = await getB2bCartContext()

    expect(ctx).toEqual({hasTiers: false, tiers: []})
  })
})
