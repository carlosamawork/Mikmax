// sanity/queries/queries/product.ts
import {groq} from 'next-sanity'
import {client} from '..'

export const PRODUCT_BY_HANDLE_QUERY = groq`
  *[_type == "product"
     && store.slug.current == $handle
     && !(_id in path('drafts.**'))][0] {
    _id,
    descripcion,
    propiedadesMaterial,
    recomendacionesLavado,
    usoRecomendado,
    "relatedProductHandles": relatedProducts[]->store.slug.current,
    "title": store.title,
    "slug": store.slug.current
  }
`

export type SanityProductDoc = {
  _id: string
  descripcion: unknown[] | null
  propiedadesMaterial: unknown[] | null
  recomendacionesLavado: unknown[] | null
  usoRecomendado: unknown[] | null
  relatedProductHandles: string[] | null
  title: string
  slug: string
}

export async function getSanityProduct(handle: string): Promise<SanityProductDoc | null> {
  const doc = await client.fetch<SanityProductDoc | null>(PRODUCT_BY_HANDLE_QUERY, {handle})
  return doc ?? null
}
