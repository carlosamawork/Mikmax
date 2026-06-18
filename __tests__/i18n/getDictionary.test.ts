import {describe, it, expect} from 'vitest'
import {getDictionary} from '@/lib/i18n/getDictionary'

describe('getDictionary', () => {
  it('returns english strings', () => {
    expect(getDictionary('en').cart.empty).toBe('Your cart is empty.')
  })

  it('returns spanish strings', () => {
    expect(getDictionary('es').cart.empty).toBe('Tu carrito está vacío.')
  })

  it('en and es expose identical key sets', () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === 'object' ? Object.keys(v).map((c) => `${k}.${c}`) : [k],
      )
    expect(keys(getDictionary('es'))).toEqual(keys(getDictionary('en')))
  })
})
