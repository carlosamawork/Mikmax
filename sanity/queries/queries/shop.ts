// sanity/queries/queries/shop.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {productHandleProjection} from '../fragments/productHandle'

export type SanityProductHandle = {
  _id: string
  handle: string
  orderRank?: string
}

/**
 * Returns ALL product handles ordered by Sanity orderRank.
 *
 * Note: the Sanity Connect schema does not expose product-collection membership
 * (that lives in Shopify only). Callers should intersect this list with the
 * collection's matching products from Shopify to filter to a specific category
 * while preserving Sanity order.
 */
export async function getOrderedHandles(): Promise<string[]> {
  const rows = await client.fetch<SanityProductHandle[]>(
    groq`*[_type == "product" && !store.isDeleted] | order(orderRank asc) {
      ${productHandleProjection}
    }`,
    {},
    {next: {tags: ['products:ordered'], revalidate: 3600}},
  )
  return rows.map((r) => r.handle).filter(Boolean)
}
