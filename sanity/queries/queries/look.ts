// sanity/queries/queries/look.ts
import {groq} from 'next-sanity'
import {client} from '..'
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

export async function getLook(slug: string): Promise<SanityLookDoc | null> {
  const doc = await client.fetch<SanityLookDoc | null>(
    LOOK_BY_SLUG_QUERY,
    {slug},
    {next: {tags: ['look', `look:${slug}`], revalidate: 3600}},
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

export async function getLookSEO(slug: string) {
  return client.fetch(
    groq`*[_type == "look" && slug.current == $slug && !(_id in path('drafts.**'))][0]{ "seo": seo{ ${seo} }, title }`,
    {slug},
    {next: {tags: ['look', `look:${slug}`], revalidate: 3600}},
  )
}
