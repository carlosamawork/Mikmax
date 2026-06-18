import type {MetadataRoute} from 'next'
import {buildUrl} from '@/utils/seoHelper'
import {isI18nEnabled} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'

// TODO: extend with dynamic routes fetched from Sanity
// Example:
// import {getPages} from '@/sanity/queries/queries/pages'
// const pages = await getPages()
// ...pages.map((p) => ({url: buildUrl(p.slug), lastModified: p._updatedAt}))

export default function sitemap(): MetadataRoute.Sitemap {
  const basePaths = ['/']
  const i18n = isI18nEnabled()
  const entries: MetadataRoute.Sitemap = []

  for (const path of basePaths) {
    const lastModified = new Date()
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
      changeFrequency: 'weekly',
      priority: 1,
      alternates,
    })

    if (i18n) {
      entries.push({
        url: buildUrl(localizedHref(path, 'es')),
        lastModified,
        changeFrequency: 'weekly',
        priority: 1,
        alternates,
      })
    }
  }

  return entries
}
