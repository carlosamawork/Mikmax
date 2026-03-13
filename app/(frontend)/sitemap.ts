import type {MetadataRoute} from 'next'
import {BASE_URL} from '@/utils/seoHelper'

// TODO: extend with dynamic routes fetched from Sanity
// Example:
// import {getPages} from '@/sanity/queries/queries/pages'
// const pages = await getPages()
// ...pages.map((p) => ({url: `${BASE_URL}/${p.slug}`, lastModified: p._updatedAt}))

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL.toString(),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
