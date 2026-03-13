import React from 'react'
import {defineField} from 'sanity'

export default defineField({
  name: 'seo.page',
  title: 'SEO',
  type: 'object',
  
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) =>
        Rule.max(50).warning('Longer titles may be truncated by search engines'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'seo.description',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
    }),
  ],
})
