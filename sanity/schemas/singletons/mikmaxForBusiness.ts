// sanity/schemas/singletons/mikmaxForBusiness.ts
import {CaseIcon} from '@sanity/icons'
import {defineField} from 'sanity'
import {blockTypeNames} from '../objects/blocks'

const TITLE = 'Mikmax for Business'

export default defineField({
  name: 'mikmaxForBusiness',
  title: TITLE,
  type: 'document',
  icon: CaseIcon,
  groups: [
    {default: true, name: 'editorial', title: 'Editorial'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'heroImage',
      title: 'Imagen del hero',
      type: 'image',
      options: {hotspot: true},
      group: 'editorial',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      description: 'Bloques que componen la landing, en orden.',
      type: 'array',
      of: blockTypeNames,
      group: 'editorial',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {subtitle: 'Landing B2B', title: TITLE}
    },
  },
})
