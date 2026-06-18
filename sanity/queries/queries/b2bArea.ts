import {groq} from 'next-sanity'
import {client} from '..'
import type {B2bAreaData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {localizedField} from '@/lib/i18n/groq'

const groupProjection = groq`{
  ${localizedField('commercialPolicy')},
  ${localizedField('purchaseConditions')},
  ${localizedField('taxInfo')},
  contactName,
  contactEmail
}`

export async function getB2bArea(lang: Locale): Promise<B2bAreaData | null> {
  return client.fetch<B2bAreaData | null>(
    groq`*[_type == "b2bArea"][0]{
      ${localizedField('intro')},
      "reseller": reseller${groupProjection},
      "designer": designer${groupProjection}
    }`,
    {lang},
    {next: {tags: ['b2bArea'], revalidate: 3600}},
  )
}
