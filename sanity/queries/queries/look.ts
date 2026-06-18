// sanity/queries/queries/look.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {Locale} from '@/lib/i18n/config'
import {image} from '../fragments/image'
import {seo} from '../fragments/seo'

export const LOOK_BY_SLUG_QUERY = groq`
  *[_type == "look"
     && slug.current == $slug
     && !(_id in path('drafts.**'))][0] {
    _id,
    title,
    "slug": slug.current,
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

export type SanityLookImage = {
  image: {
    imageUrl: string | null
    alt: string | null
  } | null
}

export type SanityLookComponent = {
  label: string | null
  color: string | null
  productHandle: string | null
  productTitle: string | null
}

export type SanityLookDoc = {
  _id: string
  title: string
  slug: string
  description: string | null
  propiedadesMaterial: unknown[] | null
  recomendacionesLavado: unknown[] | null
  usoRecomendado: unknown[] | null
  seo: unknown
  editorialImages: SanityLookImage[] | null
  components: SanityLookComponent[] | null
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  discountCode: string | null
  relatedProducts: Array<{handle: string | null}> | null
}

export async function getLook(slug: string, lang: Locale): Promise<SanityLookDoc | null> {
  const doc = await client.fetch<SanityLookDoc | null>(
    LOOK_BY_SLUG_QUERY,
    {slug, lang},
    // Lee product->store… (componentes y relatedProducts): suscribirse a `product`.
    {next: {tags: ['look', 'product', `look:${slug}`], revalidate: 3600}},
  )
  return doc ?? null
}

export async function getLookSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "look" && defined(slug.current) && !(_id in path('drafts.**'))].slug.current`,
    {},
    {next: {tags: ['look'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getLookSEO(slug: string, lang: Locale) {
  return client.fetch(
    groq`*[_type == "look" && slug.current == $slug && !(_id in path('drafts.**'))][0]{ "seo": seo{ ${seo} }, title }`,
    {slug, lang},
    {next: {tags: ['look', `look:${slug}`], revalidate: 3600}},
  )
}

export type SanityLookComponentLite = {
  color: string | null
  productHandle: string | null
}

export type SanityLookListDoc = {
  _id: string
  title: string
  slug: string
  img: {imageUrl: string | null; alt: string | null} | null
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  components: SanityLookComponentLite[] | null
  orderRank: string | null
}

export const ALL_LOOKS_QUERY = groq`
  *[_type == "look"
     && defined(slug.current)
     && !(_id in path('drafts.**'))] | order(coalesce(orderRank, title) asc) {
    _id,
    title,
    "slug": slug.current,
    "img": editorialImages[0].image{ ${image}, "alt": alt },
    discountStrategy,
    discountValue,
    "components": components[]{
      color,
      "productHandle": product->store.slug.current
    },
    orderRank
  }
`

export async function getAllLooks(): Promise<SanityLookListDoc[]> {
  const docs = await client.fetch<SanityLookListDoc[]>(
    ALL_LOOKS_QUERY,
    {},
    // Lee product->store.slug.current en los componentes: suscribirse a `product`.
    {next: {tags: ['look', 'product'], revalidate: 3600}},
  )
  return docs ?? []
}
