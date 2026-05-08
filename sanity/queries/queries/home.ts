// sanity/queries/queries/home.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {HomeData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {image} from '../fragments/image'

// Projection for one image+video slot (used by heroCampaign and campaignImageVideo)
const mediaProjection = `
  mediaType,
  image{
    ${image},
    "alt": alt
  },
  video{
    src,
    posterAlt,
    poster{
      ${image}
    }
  }
`

export async function getHome(): Promise<HomeData> {
  const result = await client.fetch<HomeData | null>(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder[]{
        _key,
        _type,
        _type == "block.heroCampaign" => {
          slides[]{
            _key,
            ${mediaProjection},
            title,
            url
          }
        },
        _type == "block.campaignImageVideo" => {
          ${mediaProjection},
          headline,
          url,
          aspectRatio,
          fullBleed
        },
        _type == "block.featuredSection" => {
          slides[]{
            _key,
            image{
              ${image},
              "alt": alt
            },
            title,
            url
          }
        },
        _type == "block.imageWithProduct" => {
          feature{
            image{
              ${image},
              "alt": alt
            },
            title,
            url
          },
          "product": product->{
            _id,
            "title": store.title,
            "handle": store.slug.current,
            "imageUrl": store.previewImageUrl,
            "price": store.priceRange.minVariantPrice,
            "compareAtPrice": store.priceRange.maxVariantPrice
          },
          imagePosition
        },
        _type == "block.richText" => {
          body
        }
      }
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
  return result ?? {}
}

export async function getHomeSEO() {
  return client.fetch(
    groq`*[_type == "home"][0]{
      seo{
        ${seo}
      }
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
}
