import {describe, it, expect} from 'vitest'
import {
  isReturnEligible,
  adminOrderGid,
  validateSelections,
  RETURN_REASONS,
} from '@/lib/account/returns'

const NOW = new Date('2026-07-17T12:00:00Z')

describe('isReturnEligible', () => {
  const base = {processedAt: '2026-07-01T10:00:00Z', financialStatus: 'PAID', returnStatus: null}
  it('pagado, reciente y sin devolucion -> true', () => {
    expect(isReturnEligible(base, NOW)).toBe(true)
  })
  it('mas de 30 dias -> false (borde exacto 30 dias -> true)', () => {
    expect(isReturnEligible({...base, processedAt: '2026-06-16T11:00:00Z'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, processedAt: '2026-06-17T12:00:00Z'}, NOW)).toBe(true)
  })
  it('no pagado -> false', () => {
    expect(isReturnEligible({...base, financialStatus: 'PENDING'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, financialStatus: null}, NOW)).toBe(false)
  })
  it('devolucion en curso -> false', () => {
    expect(isReturnEligible({...base, returnStatus: 'RETURN_REQUESTED'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, returnStatus: 'IN_PROGRESS'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, returnStatus: 'RETURNED'}, NOW)).toBe(true)
  })
  it('fecha invalida -> false', () => {
    expect(isReturnEligible({...base, processedAt: ''}, NOW)).toBe(false)
  })
})

describe('adminOrderGid', () => {
  it('convierte el id Storefront (con ?key=) a GID Admin', () => {
    expect(adminOrderGid('gid://shopify/Order/6053622?key=abc123')).toBe(
      'gid://shopify/Order/6053622',
    )
    expect(adminOrderGid('gid://shopify/Order/6053622')).toBe('gid://shopify/Order/6053622')
  })
  it('id no reconocible -> null', () => {
    expect(adminOrderGid('')).toBeNull()
    expect(adminOrderGid('gid://shopify/Product/1')).toBeNull()
  })
})

describe('validateSelections', () => {
  const available = [
    {fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/1', maxQuantity: 2},
    {fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/2', maxQuantity: 1},
  ]
  it('seleccion valida -> normalizada', () => {
    expect(
      validateSelections(
        [
          {
            fulfillmentLineItemId: available[0].fulfillmentLineItemId,
            quantity: 2,
            returnReason: 'DEFECTIVE',
          },
        ],
        available,
      ),
    ).toEqual([
      {
        fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/1',
        quantity: 2,
        returnReason: 'DEFECTIVE',
      },
    ])
  })
  it('vacia, cantidad fuera de rango, motivo invalido o id desconocido -> null', () => {
    expect(validateSelections([], available)).toBeNull()
    expect(
      validateSelections(
        [
          {
            fulfillmentLineItemId: available[0].fulfillmentLineItemId,
            quantity: 3,
            returnReason: 'DEFECTIVE',
          },
        ],
        available,
      ),
    ).toBeNull()
    expect(
      validateSelections(
        [
          {
            fulfillmentLineItemId: available[0].fulfillmentLineItemId,
            quantity: 1,
            returnReason: 'NOPE',
          },
        ],
        available,
      ),
    ).toBeNull()
    expect(
      validateSelections(
        [{fulfillmentLineItemId: 'gid://x/9', quantity: 1, returnReason: 'OTHER'}],
        available,
      ),
    ).toBeNull()
  })
  it('mismo id repetido -> null (evita multiplicar cantidad)', () => {
    expect(
      validateSelections(
        [
          {
            fulfillmentLineItemId: available[0].fulfillmentLineItemId,
            quantity: 1,
            returnReason: 'DEFECTIVE',
          },
          {
            fulfillmentLineItemId: available[0].fulfillmentLineItemId,
            quantity: 1,
            returnReason: 'DEFECTIVE',
          },
        ],
        available,
      ),
    ).toBeNull()
  })
})

describe('RETURN_REASONS', () => {
  it('enum completo de Shopify', () => {
    expect(RETURN_REASONS.map((r) => r.value)).toEqual([
      'SIZE_TOO_SMALL',
      'SIZE_TOO_LARGE',
      'UNWANTED',
      'NOT_AS_DESCRIBED',
      'WRONG_ITEM',
      'DEFECTIVE',
      'COLOR',
      'STYLE',
      'OTHER',
    ])
  })
})
