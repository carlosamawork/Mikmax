import {DocumentVideoIcon} from '@sanity/icons'
import {defineField} from 'sanity'

export default defineField({
  name: 'module.video',
  title: 'Video',
  type: 'object',
  icon: DocumentVideoIcon,
  fields: [
    defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Thumbnail',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
    }),
    // Image
    defineField({
      name: 'videoUrl',
      title: 'Video url',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
    prepare(selection) {
      const {title} = selection

      return {
        title: title,
      }
    },
  },
})