// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import type {SettingsData} from '@/sanity/types'
import {seo} from '../fragments/seo'

export async function getSettings(): Promise<SettingsData> {
  return client.fetch(
    groq`*[_type == "settings"][0]{
      menu{
        links[]{
          ...,
          _type == "menuGroup" => {
            label,
            items[]{...},
            "featuredProduct": featuredProduct->{
              _id,
              "title": store.title,
              "handle": store.slug.current,
              "image": store.previewImageUrl
            }
          }
        }
      },
      footer{
        links[]{...},
        linksSocial[]{...},
        linksTerms[]{...},
        socialModule[]{...},
        text
      },
      seo{ ${seo} }
    }`,
    {},
    {next: {tags: ['settings'], revalidate: 3600}},
  )
}
