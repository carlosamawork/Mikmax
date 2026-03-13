import {HomeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

const TITLE = 'Home'

export default defineField({
  name: 'home',
  title: TITLE,
  type: 'document',
  icon: HomeIcon,
  groups: [
    {
      default: true,
      name: 'editorial',
      title: 'Editorial',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],
  fields: [
    // Hero
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'hero.home',
      group: 'editorial',
    }),
    
    defineField({
      name: 'destacados',
      title: 'Destacados',
      type: 'array',
      of: [
        {
          title: 'Post or Product',
          type: 'reference',
          to: [{type: 'post'}, {type: 'product'}],
        },
      ],
      group: 'editorial',
    }),
    defineField({
      name: 'importantes',
      title: 'Importante',
      type: 'array',
      of: [
        {
          title: 'Post or Product',
          type: 'reference',
          to: [{type: 'post'},
          {type: 'product'}],
        },
      ],
      group: 'editorial',
    }),
    // Modules
    defineField({
      name: 'modulos',
      title: 'Módulos',
      type: 'array',
      of: [
        {type: 'module.blog'},
        {type: 'module.imageSide'},
      ],
      group: 'editorial',
    }),
    // SEO
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.home',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {
        // media: icon,
        subtitle: 'Index',
        title: TITLE,
      }
    },
  },
})
