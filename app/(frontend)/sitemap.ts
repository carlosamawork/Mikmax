import type {MetadataRoute} from 'next'
import {groq} from 'next-sanity'
import {buildUrl} from '@/utils/seoHelper'
import {isI18nEnabled, DEFAULT_LOCALE} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'
import {client} from '@/sanity/queries'
import {getPageSlugs} from '@/sanity/queries/queries/page'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {getLookSlugs} from '@/sanity/queries/queries/look'
import {getSetSlugs} from '@/sanity/queries/queries/set'
import {getLegalPage} from '@/sanity/queries/queries/legal'

type RouteConfig = {
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

// Lista los handles de todas las colecciones publicadas (incluye ocultas del
// menú, que siguen siendo páginas indexables en /shop/[handle]).
async function getCollectionHandles(): Promise<string[]> {
  const handles = await client.fetch<string[]>(
    groq`*[_type == "collection" && !store.isDeleted && defined(store.slug.current)].store.slug.current`,
    {},
    {next: {tags: ['collection', 'settings'], revalidate: 3600}},
  )
  return (handles ?? []).filter(Boolean)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const i18n = isI18nEnabled()

  // Rutas dinámicas en paralelo. Si alguna falla, se omite ese tipo de ruta.
  const [pageSlugs, productHandles, collectionHandles, lookSlugs, setSlugs, legalPage] =
    await Promise.all([
      getPageSlugs().catch(() => [] as string[]),
      getOrderedHandles().catch(() => [] as string[]),
      getCollectionHandles().catch(() => [] as string[]),
      getLookSlugs().catch(() => [] as string[]),
      getSetSlugs().catch(() => [] as string[]),
      getLegalPage(DEFAULT_LOCALE).catch(() => null),
    ])

  const legalSlugs = (legalPage?.sections ?? [])
    .map((sec) => sec.slug)
    .filter((slug): slug is string => Boolean(slug))

  // Cada grupo: lista de paths + config de changeFrequency/priority.
  const groups: Array<{paths: string[]; config: RouteConfig}> = [
    {paths: ['/'], config: {changeFrequency: 'weekly', priority: 1}},
    {
      paths: pageSlugs.filter(Boolean).map((slug) => '/' + slug),
      config: {changeFrequency: 'monthly', priority: 0.6},
    },
    {
      paths: productHandles.filter(Boolean).map((h) => '/products/' + h),
      config: {changeFrequency: 'weekly', priority: 0.8},
    },
    {
      paths: collectionHandles.filter(Boolean).map((h) => '/shop/' + h),
      config: {changeFrequency: 'weekly', priority: 0.8},
    },
    {
      paths: lookSlugs.filter(Boolean).map((slug) => '/looks/' + slug),
      config: {changeFrequency: 'weekly', priority: 0.7},
    },
    {
      paths: setSlugs.filter(Boolean).map((slug) => '/sets/' + slug),
      config: {changeFrequency: 'weekly', priority: 0.7},
    },
    {
      paths: legalSlugs.map((slug) => '/legal/' + slug),
      config: {changeFrequency: 'yearly', priority: 0.3},
    },
  ]

  const entries: MetadataRoute.Sitemap = []
  const lastModified = new Date()

  for (const {paths, config} of groups) {
    for (const path of paths) {
      const alternates = i18n
        ? {
            languages: {
              en: buildUrl(localizedHref(path, 'en')),
              es: buildUrl(localizedHref(path, 'es')),
            },
          }
        : undefined

      entries.push({
        url: buildUrl(path),
        lastModified,
        changeFrequency: config.changeFrequency,
        priority: config.priority,
        alternates,
      })

      if (i18n) {
        entries.push({
          url: buildUrl(localizedHref(path, 'es')),
          lastModified,
          changeFrequency: config.changeFrequency,
          priority: config.priority,
          alternates,
        })
      }
    }
  }

  return entries
}
