// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import {getCollectionHandlesWithProducts} from '@/lib/shopify'
import type {
  SettingsData,
  MenuShop,
  CollectionTreeParent,
  FooterColumnShop,
  FooterCollectionParent,
} from '@/sanity/types'
import {seo} from '../fragments/seo'

// Everything below is inlined (no fragment interpolation) on purpose. Once
// linkResolved/linkInternalHref were interpolated 3-4 levels deep with
// surrounding `_type == "X" => {…}` arms, the GROQ parser kept failing with
// "expected '}' following object body" at unpredictable positions. Keeping
// the whole settings projection literal — and projecting every possible
// field flat — sidesteps any interpolation/conditional-spread weirdness.

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
          _key,
          _type,
          title,
          url,
          newWindow,
          label,
          "ref": reference->{ _type, "slug": coalesce(store.slug.current, slug.current) },
          items[]{
            _key,
            _type,
            title,
            url,
            newWindow,
            "ref": reference->{ _type, "slug": coalesce(store.slug.current, slug.current) }
          },
          "featuredProduct": featuredProduct->{
            _id,
            "title": store.title,
            "handle": store.slug.current,
            "image": store.previewImageUrl
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
          _key,
          _type,
          title,
          links[]{
            _key,
            _type,
            title,
            url,
            newWindow,
            "ref": reference->{ _type, "slug": coalesce(store.slug.current, slug.current) }
          },
          extraLinks[]{
            _key,
            _type,
            title,
            url,
            newWindow,
            "ref": reference->{ _type, "slug": coalesce(store.slug.current, slug.current) }
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

  const [tree, handlesWithProducts] = await Promise.all([
    fetchCollectionTree(),
    getCollectionHandlesWithProducts().catch(() => [] as string[]),
  ])

  const productSet = new Set(handlesWithProducts)
  const megamenuTree: CollectionTreeParent[] = tree
    .map((p) => {
      const filteredChildren = (p.children ?? []).filter(
        (c) => c.handle && productSet.has(c.handle),
      )
      const hasOwnProducts = Boolean(p.handle && productSet.has(p.handle))
      return {
        ...p,
        children: filteredChildren,
        hasOwnProducts,
      }
    })
    .filter((p) => p.hasOwnProducts || (p.children?.length ?? 0) > 0)

  const parents: FooterCollectionParent[] = tree.map((p) => ({
    title: p.title,
    handle: p.handle,
  }))

  if (settings.menu) {
    settings.menu = {
      ...settings.menu,
      links: links.map((link) =>
        link._type === 'menuShop'
          ? ({...(link as MenuShop), tree: megamenuTree} as MenuShop)
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
