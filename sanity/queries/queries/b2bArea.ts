import {groq} from 'next-sanity'
import {client} from '..'
import type {B2bAreaData} from '@/sanity/types'

const groupProjection = groq`{
  commercialPolicy,
  purchaseConditions,
  taxInfo,
  contactName,
  contactEmail
}`

export async function getB2bArea(): Promise<B2bAreaData | null> {
  return client.fetch<B2bAreaData | null>(
    groq`*[_type == "b2bArea"][0]{
      intro,
      "reseller": reseller${groupProjection},
      "designer": designer${groupProjection}
    }`,
    {},
    {next: {tags: ['b2bArea'], revalidate: 3600}},
  )
}
