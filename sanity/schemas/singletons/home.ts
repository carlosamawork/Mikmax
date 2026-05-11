// sanity/schemas/singletons/home.ts
import {HomeIcon} from '@sanity/icons'
import {defineField} from 'sanity'
import {blockTypeNames} from '../objects/blocks'

const TITLE = 'Home'

export default defineField({
  name: 'home',
  title: TITLE,
  type: 'document',
  icon: HomeIcon,
  groups: [
    {default: true, name: 'editorial', title: 'Editorial'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      description: 'Bloques que componen la home, en orden.',
      type: 'array',
      of: blockTypeNames,
      group: 'editorial',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.home',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {subtitle: 'Index', title: TITLE}
    },
  },
})
