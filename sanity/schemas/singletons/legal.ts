import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const TITLE = 'Legal Page'

export default defineType({
  name: 'legalPage',
  title: TITLE,
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {default: true, name: 'editorial', title: 'Editorial'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Legal',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description:
        'Cada sección es un texto legal con su propio slug y SEO. El orden aquí define el orden en la sidebar.',
      type: 'array',
      group: 'editorial',
      of: [
        defineField({
          name: 'legalSection',
          title: 'Section',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'slug',
              title: 'Slug',
              type: 'slug',
              options: {source: 'title', maxLength: 96},
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Body',
              type: 'body',
            }),
            defineField({
              name: 'seo',
              title: 'SEO',
              type: 'seo.page',
            }),
          ],
          preview: {
            select: {title: 'title', subtitle: 'slug.current'},
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'seo',
      title: 'SEO (fallback)',
      description:
        'SEO usado para /legal y como fallback cuando una sección no tiene SEO propio.',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {subtitle: 'Singleton', title: TITLE}
    },
  },
})
