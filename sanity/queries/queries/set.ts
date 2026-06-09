// sanity/queries/queries/set.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {image} from '../fragments/image'
import {seo} from '../fragments/seo'
import type {SanityLookDoc} from './look'

export type SanitySetDoc = SanityLookDoc & {colorLocked: string | null}

export const SET_BY_SLUG_QUERY = groq`
  *[_type == "set"
     && slug.current == $slug
     && !(_id in path('drafts.**'))][0] {
    _id,
    title,
    "slug": slug.current,
    colorLocked,
    description,
    propiedadesMaterial,
    recomendacionesLavado,
    usoRecomendado,
    "seo": seo{ ${seo} },
    editorialImages[]{
      image{
        ${image},
        "alt": alt
      }
    },
    "components": components[]{
      label,
      color,
      "productHandle": product->store.slug.current,
      "productTitle": product->store.title
    },
    discountStrategy,
    discountValue,
    discountCode,
    "relatedProducts": relatedProducts[]->{
      "handle": store.slug.current
    }
  }
`

export async function getSet(slug: string): Promise<SanitySetDoc | null> {
  const doc = await client.fetch<SanitySetDoc | null>(
    SET_BY_SLUG_QUERY,
    {slug},
    // Lee product->store… (componentes y relatedProducts): suscribirse a `product`.
    {next: {tags: ['set', 'product', `set:${slug}`], revalidate: 3600}},
  )
  return doc ?? null
}

export async function getSetSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "set" && defined(slug.current) && !(_id in path('drafts.**'))].slug.current`,
    {},
    {next: {tags: ['set'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getSetSEO(slug: string) {
  return client.fetch(
    groq`*[_type == "set" && slug.current == $slug && !(_id in path('drafts.**'))][0]{ "seo": seo{ ${seo} }, title }`,
    {slug},
    {next: {tags: ['set', `set:${slug}`], revalidate: 3600}},
  )
}
