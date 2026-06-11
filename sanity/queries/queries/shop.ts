// sanity/queries/queries/shop.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {productHandleProjection} from '../fragments/productHandle'
import type {EditorialImage} from '@/types/shop'

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

/**
 * Imágenes editoriales (`imagenesDestacadas`) de una colección, intercaladas en
 * el grid de productos en la Vista 2. El orden del array define el orden de
 * aparición. `/shop` (handle 'all') no tiene documento collection, así que ahí
 * no hay editoriales (el caller pasa []).
 */
export async function getCollectionEditorialImages(handle: string): Promise<EditorialImage[]> {
  const res = await client.fetch<{images?: (EditorialImage | null)[]} | null>(
    groq`*[_type == "collection" && store.slug.current == $handle][0]{
      "images": imagenesDestacadas[]{
        "imageUrl": image.asset->url,
        "alt": coalesce(image.alt, ""),
        "blurDataURL": image.asset->_id,
        "width": image.asset->metadata.dimensions.width,
        "height": image.asset->metadata.dimensions.height,
        "caption": caption,
        "href": callToAction.url
      }
    }`,
    {handle},
    {next: {tags: ['collection', `collection:${handle}`], revalidate: 300}},
  )
  return (res?.images ?? []).filter(
    (img): img is EditorialImage => Boolean(img && img.imageUrl),
  )
}
