// sanity/queries/queries/product.ts
import {groq} from 'next-sanity'
import {client} from '..'

export const PRODUCT_BY_HANDLE_QUERY = groq`
  *[_type == "product"
     && store.slug.current == $handle
     && !(_id in path('drafts.**'))][0] {
    _id,
    propiedadesMaterial,
    recomendacionesLavado,
    usoRecomendado,
    "relatedItems": relatedProducts[]{
      "handle": product->store.slug.current,
      "variantColor": variant->store.option1,
      "variantImageUrl": variant->store.previewImageUrl
    },
    "title": store.title,
    "slug": store.slug.current
  }
`

export type SanityRelatedItem = {
  handle: string | null
  variantColor: string | null
  variantImageUrl: string | null
}

export type SanityProductDoc = {
  _id: string
  propiedadesMaterial: unknown[] | null
  recomendacionesLavado: unknown[] | null
  usoRecomendado: unknown[] | null
  relatedItems: SanityRelatedItem[] | null
  title: string
  slug: string
}

export async function getSanityProduct(handle: string): Promise<SanityProductDoc | null> {
  const doc = await client.fetch<SanityProductDoc | null>(PRODUCT_BY_HANDLE_QUERY, {handle})
  return doc ?? null
}
