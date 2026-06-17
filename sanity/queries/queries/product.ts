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
      "optionNames": product->store.options[].name,
      "variantOptions": [variant->store.option1, variant->store.option2, variant->store.option3],
      "variantImageUrl": variant->store.previewImageUrl
    },
    "relatedByColor": relatedByColor[]{
      color,
      "products": products[]{
        "handle": product->store.slug.current,
        "optionNames": product->store.options[].name,
        "variantOptions": [variant->store.option1, variant->store.option2, variant->store.option3],
        "variantImageUrl": variant->store.previewImageUrl
      }
    },
    "title": store.title,
    "slug": store.slug.current
  }
`

export type SanityRelatedItem = {
  handle: string | null
  optionNames: (string | null)[] | null
  variantOptions: (string | null)[] | null
  variantImageUrl: string | null
}

export type SanityRelatedColorGroup = {
  color: string | null
  products: SanityRelatedItem[] | null
}

export type SanityProductDoc = {
  _id: string
  propiedadesMaterial: unknown[] | null
  recomendacionesLavado: unknown[] | null
  usoRecomendado: unknown[] | null
  relatedItems: SanityRelatedItem[] | null
  relatedByColor: SanityRelatedColorGroup[] | null
  title: string
  slug: string
}

export async function getSanityProduct(handle: string): Promise<SanityProductDoc | null> {
  const doc = await client.fetch<SanityProductDoc | null>(
    PRODUCT_BY_HANDLE_QUERY,
    {handle},
    {next: {tags: ['product', `product:${handle}`], revalidate: 3600}},
  )
  return doc ?? null
}
