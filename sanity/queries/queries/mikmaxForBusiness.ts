import {groq} from 'next-sanity'
import {client} from '..'
import type {MikmaxForBusinessData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {image} from '../fragments/image'
import {pageBuilderProjection} from '../fragments/pageBuilder'

export async function getMikmaxForBusiness(): Promise<MikmaxForBusinessData> {
  const result = await client.fetch<MikmaxForBusinessData | null>(
    groq`*[_type == "mikmaxForBusiness"][0]{
      heroImage{
        ${image},
        "alt": alt
      },
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      },
      seo{
        ${seo}
      }
    }`,
    {},
    {next: {tags: ['mikmaxForBusiness'], revalidate: 3600}},
  )
  return result ?? {}
}
