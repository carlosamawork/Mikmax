import {MetadataRoute} from 'next'
import {buildUrl} from '@/utils/seoHelper'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin/'],
    },
    sitemap: buildUrl('/sitemap.xml'),
  }
}