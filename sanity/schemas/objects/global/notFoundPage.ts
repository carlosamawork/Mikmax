import {defineField} from 'sanity'

export default defineField({
  name: 'notFoundPage',
  title: '404 page',
  type: 'object',
  group: 'notFoundPage',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'collection',
      title: 'Collection',
      type: 'reference',
      description: 'Collection products displayed on this page',
      weak: true,
      to: [
        {
          name: 'collection',
          type: 'collection',
        },
      ],
    }),
  ],
})
