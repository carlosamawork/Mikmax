// sanity/queries/queries/set.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {Locale} from '@/lib/i18n/config'
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

export async function getSet(slug: string, lang: Locale): Promise<SanitySetDoc | null> {
  const doc = await client.fetch<SanitySetDoc | null>(
    SET_BY_SLUG_QUERY,
    {slug, lang},
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

export async function getSetSEO(slug: string, lang: Locale) {
  return client.fetch(
    groq`*[_type == "set" && slug.current == $slug && !(_id in path('drafts.**'))][0]{ "seo": seo{ ${seo} }, title }`,
    {slug, lang},
    {next: {tags: ['set', `set:${slug}`], revalidate: 3600}},
  )
}

export type SanitySetComponentLite = {
  color: string | null
  productHandle: string | null
}

export type SanitySetListDoc = {
  _id: string
  title: string
  slug: string
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  components: SanitySetComponentLite[] | null
  orderRank: string | null
}

export const ALL_SETS_QUERY = groq`
  *[_type == "set"
     && defined(slug.current)
     && !(_id in path('drafts.**'))] | order(coalesce(orderRank, title) asc) {
    _id,
    title,
    "slug": slug.current,
    discountStrategy,
    discountValue,
    "components": components[]{
      color,
      "productHandle": product->store.slug.current
    },
    orderRank
  }
`

export async function getAllSets(): Promise<SanitySetListDoc[]> {
  const docs = await client.fetch<SanitySetListDoc[]>(
    ALL_SETS_QUERY,
    {},
    // Lee product->store.slug.current en los componentes: suscribirse a `product`.
    {next: {tags: ['set', 'product'], revalidate: 3600}},
  )
  return docs ?? []
}
