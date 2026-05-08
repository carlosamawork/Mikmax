// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import type {SettingsData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {linkResolved, socialLinkResolved} from '../fragments/links'

// Parent collections + their children, in manual order (orderRank from
// "Ordenar Colecciones") with title fallback when rank not set.
// Used by both the Shop mega-menu (header) and the Shop column (footer).
const collectionTree = groq`
  *[_type == "collection" && !defined(parent) && !store.isDeleted] | order(coalesce(orderRank, store.title) asc) {
    "title": store.title,
    "handle": store.slug.current,
    "imageUrl": store.imageUrl,
    "children": *[_type == "collection" && parent._ref == ^._id && !store.isDeleted] | order(coalesce(orderRank, store.title) asc) {
      "title": store.title,
      "handle": store.slug.current
    }
  }
`

const collectionParents = groq`
  *[_type == "collection" && !defined(parent) && !store.isDeleted] | order(coalesce(orderRank, store.title) asc) {
    "title": store.title,
    "handle": store.slug.current
  }
`

export async function getSettings(): Promise<SettingsData> {
  const result = await client.fetch<SettingsData | null>(
    groq`*[_type == "settings"][0]{
      menu{
        links[]{
          ${linkResolved},
          _type == "menuGroup" => {
            _key,
            _type,
            label,
            items[]{ ${linkResolved} },
            "featuredProduct": featuredProduct->{
              _id,
              "title": store.title,
              "handle": store.slug.current,
              "image": store.previewImageUrl
            }
          },
          _type == "menuShop" => {
            _key,
            _type,
            label,
            "tree": ${collectionTree}
          }
        }
      },
      banner{
        enabled,
        text,
        url
      },
      footer{
        newsletter,
        columns[]{
          ...,
          _type == "footerColumn" => {
            _key,
            _type,
            title,
            links[]{ ${linkResolved} }
          },
          _type == "footerColumnShop" => {
            _key,
            _type,
            title,
            "parents": ${collectionParents},
            extraLinks[]{ ${linkResolved} }
          },
          _type == "footerColumnSocial" => {
            _key,
            _type,
            title,
            links[]{ ${socialLinkResolved} }
          }
        },
        regions[]{
          _key,
          code,
          label,
          currency,
          isDefault
        }
      },
      seo{ ${seo} }
    }`,
    {},
    {next: {tags: ['settings'], revalidate: 3600}},
  )
  return result ?? {}
}
