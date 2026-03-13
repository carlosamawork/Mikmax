// sanity/queries/common/settings.ts
import { groq } from 'next-sanity'
import { client } from '../index'
import type { SettingsData } from '@/sanity/types'
import { seo } from '../fragments/seo'

export async function getSettings(): Promise<SettingsData> {
  return client.fetch(
    groq`*[_type == "settings"][0]{
      headerMenu,
      footerMenu,
      seo{
        ${seo}
      }
    }`,
    {},
    {
      next: {
        tags: ['settings'], // ISR tag
        revalidate: 60,     // revalidate every 60s
      },
    }
  )
}
