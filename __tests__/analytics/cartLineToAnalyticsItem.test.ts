import {describe, it, expect} from 'vitest'
import {cartLineToAnalyticsItem} from '@/lib/analytics/item'

describe('cartLineToAnalyticsItem', () => {
  it('formatea el item_id como shopify_ZZ_{productId}_{variantId}, nunca el GID crudo', () => {
    const item = cartLineToAnalyticsItem({
      productGid: 'gid://shopify/Product/8123456789',
      variantGid: 'gid://shopify/ProductVariant/45123456789',
      title: 'Funda nórdica',
      price: 89,
      quantity: 1,
    })
    expect(item.id).toBe('shopify_ZZ_8123456789_45123456789')
    expect(item.id).not.toContain('gid://')
  })

  it('construye la etiqueta de variante con color / talla, ignorando Default', () => {
    const item = cartLineToAnalyticsItem({
      productGid: 'gid://shopify/Product/1',
      variantGid: 'gid://shopify/ProductVariant/2',
      title: 'Cojín',
      price: 30,
      quantity: 2,
      color: 'Terracota',
      size: '50x50',
    })
    expect(item.variant).toBe('Terracota / 50x50')

    const noVariant = cartLineToAnalyticsItem({
      productGid: 'gid://shopify/Product/1',
      variantGid: 'gid://shopify/ProductVariant/2',
      title: 'Cojín',
      price: 30,
      quantity: 1,
      color: 'Default',
    })
    expect(noVariant.variant).toBeUndefined()
  })

  it('aplica valores seguros: price no numérico → 0, title ausente → cadena vacía', () => {
    const item = cartLineToAnalyticsItem({
      productGid: 'gid://shopify/Product/1',
      variantGid: 'gid://shopify/ProductVariant/2',
      quantity: 1,
    })
    expect(item.price).toBe(0)
    expect(item.name).toBe('')
    expect(item.quantity).toBe(1)
    expect(item.currency).toBeTruthy()
  })
})
