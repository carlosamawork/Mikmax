// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import type {SettingsData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {linkResolved, socialLinkResolved} from '../fragments/links'

export async function getSettings(): Promise<SettingsData> {
  return client.fetch(
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
          }
        }
      },
      footer{
        links[]{ ${linkResolved} },
        linksSocial[]{ ${socialLinkResolved} },
        linksTerms[]{ ${linkResolved} },
        socialModule[]{ ${socialLinkResolved} },
        text
      },
      seo{ ${seo} }
    }`,
    {},
    {next: {tags: ['settings'], revalidate: 3600}},
  )
}
