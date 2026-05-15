import {CogIcon} from '@sanity/icons'
import {defineType, defineField} from 'sanity'

const TITLE = 'Settings'

export default defineType({
  name: 'settings',
  title: TITLE,
  type: 'document',
  icon: CogIcon,
  groups: [
    {
      default: true,
      name: 'navigation',
      title: 'Navigation',
    },
    {
      name: 'banner',
      title: 'Banner anuncio',
    },
    {
      name: 'notFoundPage',
      title: '404 page',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],
  fields: [
    // Menu
    defineField({
      name: 'menu',
      title: 'Menu',
      type: 'menuSettings',
      group: 'navigation',
    }),
    // Footer
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'footerSettings',
      group: 'navigation',
    }),
    // Announcement banner (above header)
    defineField({
      name: 'banner',
      title: 'Banner anuncio',
      type: 'announcementBanner',
      group: 'banner',
    }),
    // Not found page
    defineField({
      name: 'notFoundPage',
      title: '404 page',
      type: 'notFoundPage',
      group: 'notFoundPage',
    }),
    // SEO
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: TITLE,
      }
    },
  },
})
