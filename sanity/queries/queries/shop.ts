// sanity/queries/queries/shop.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {collectionProjection} from '../fragments/collection'
import {productHandleProjection} from '../fragments/productHandle'
import {ALL_HANDLE} from '@/types/shop'

export type SanityCollection = {
  _id: string
  title: string
  handle: string
  descriptionHtml?: string
  parent?: {
    title: string
    handle: string
    parent?: {title: string; handle: string}
  }
}

export type SanityProductHandle = {
  _id: string
  handle: string
  orderRank?: string
}

/**
 * Returns Sanity metadata for a collection by Shopify slug.
 * Returns null when the handle is the virtual "all" or not found.
 */
export async function getCollectionByHandle(
  handle: string,
): Promise<SanityCollection | null> {
  if (handle === ALL_HANDLE) return null
  return client.fetch<SanityCollection | null>(
    groq`*[_type == "collection" && store.slug.current == $handle && !store.isDeleted][0]{
      ${collectionProjection}
    }`,
    {handle},
    {next: {tags: [`collection:${handle}`], revalidate: 3600}},
  )
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
