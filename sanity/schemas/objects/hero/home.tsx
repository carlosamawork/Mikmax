import {defineField} from 'sanity'

export default defineField({
  name: 'hero.home',
  title: 'Home hero',
  type: 'object',
  fields: [
    // Title
    defineField({
      name: 'title',
      title: 'Title',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'carrouselText',
      title: 'Texto cambiante',
      type: 'array',
      validation: (Rule) => Rule.min(1),
      of: [
        {
          type: 'string',
        },
      ],
    }),
    // Content
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      validation: (Rule) => Rule.min(1),
      of: [
        {
          name: 'imageWithProductHotspots',
          title: 'Image',
          type: 'imageWithProductHotspots',
        },
      ],
    }),
  ],
})
