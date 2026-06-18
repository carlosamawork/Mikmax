import {groq} from 'next-sanity'
import {client} from '..'
import type {HomeData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {seo} from '../fragments/seo'
import {pageBuilderProjection} from '../fragments/pageBuilder'

export async function getHome(lang: Locale): Promise<HomeData> {
  const result = await client.fetch<HomeData | null>(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      }
    }`,
    {lang},
    // La home renderiza productos y looks: suscribirse a sus tipos para refrescarla.
    {next: {tags: ['home', 'product', 'look'], revalidate: 3600}},
  )
  return result ?? {}
}

export async function getHomeSEO(lang: Locale) {
  return client.fetch(
    groq`*[_type == "home"][0]{
      seo{
        ${seo}
      }
    }`,
    {lang},
    {next: {tags: ['home'], revalidate: 3600}},
  )
}
