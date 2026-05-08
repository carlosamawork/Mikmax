// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import type {
  SettingsData,
  MenuShop,
  CollectionTreeParent,
  FooterColumnShop,
  FooterCollectionParent,
} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {linkResolved, socialLinkResolved} from '../fragments/links'

// We resolve the parent/child collection tree in two flat fetches and merge
// in TypeScript. Inlining a nested `*[parent._ref == ^._id]` sub-query inside
// the settings projection makes the GROQ parser fail with "expected '}'
// following object body" — likely the `^` scope crossing too many projection
// levels — so we keep the GROQ flat and join here.

type RawParent = {
  _id: string
  title?: string
  handle?: string
  imageUrl?: string
}

type RawChild = {
  parent: string
  title?: string
  handle?: string
}

async function fetchCollectionTree(): Promise<CollectionTreeParent[]> {
  const [parents, children] = await Promise.all([
    client.fetch<RawParent[]>(
      groq`*[_type == "collection" && !defined(parent) && !store.isDeleted] | order(coalesce(orderRank, store.title) asc) {
        _id,
        "title": store.title,
        "handle": store.slug.current,
        "imageUrl": store.imageUrl
      }`,
      {},
      {next: {tags: ['settings'], revalidate: 3600}},
    ),
    client.fetch<RawChild[]>(
      groq`*[_type == "collection" && defined(parent) && !store.isDeleted] | order(coalesce(orderRank, store.title) asc) {
        "parent": parent._ref,
        "title": store.title,
        "handle": store.slug.current
      }`,
      {},
      {next: {tags: ['settings'], revalidate: 3600}},
    ),
  ])

  return (parents ?? []).map((p) => ({
    title: p.title,
    handle: p.handle,
    imageUrl: p.imageUrl,
    children: (children ?? [])
      .filter((c) => c.parent === p._id)
      .map((c) => ({title: c.title, handle: c.handle})),
  }))
}

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
            label
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

  const settings: SettingsData = result ?? {}

  // Lazy-load the collection tree only if some piece of settings actually
  // wants it (a menuShop in the nav or a footerColumnShop in the footer).
  const links = settings.menu?.links ?? []
  const columns = settings.footer?.columns ?? []
  const needsTree =
    links.some((l) => l._type === 'menuShop') ||
    columns.some((c) => c._type === 'footerColumnShop')

  if (!needsTree) return settings

  const tree = await fetchCollectionTree()
  const parents: FooterCollectionParent[] = tree.map((p) => ({
    title: p.title,
    handle: p.handle,
  }))

  if (settings.menu) {
    settings.menu = {
      ...settings.menu,
      links: links.map((link) =>
        link._type === 'menuShop'
          ? ({...(link as MenuShop), tree} as MenuShop)
          : link,
      ),
    }
  }

  if (settings.footer) {
    settings.footer = {
      ...settings.footer,
      columns: columns.map((col) =>
        col._type === 'footerColumnShop'
          ? ({...(col as FooterColumnShop), parents} as FooterColumnShop)
          : col,
      ),
    }
  }

  return settings
}
