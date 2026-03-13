import {defineField} from 'sanity'

export default defineField({
  name: 'htmlEmbed',
  title: 'HTML Embed',
  type: 'object',
  fields: [
    defineField({
      name: 'html',
      title: 'HTML Code',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {html: 'html'},
    prepare({html}) {
      return {
        title: 'HTML Embed',
        subtitle: html?.slice(0, 60),
      }
    },
  },
})
