// sanity/schemas/objects/blocks/richText.ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.richText',
  title: 'Texto rico',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'body',
      type: 'body', // reuses existing block content schema
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {body: 'body'},
    prepare({body}) {
      const firstBlock = Array.isArray(body) ? body[0] : null
      const text =
        firstBlock?.children
          ?.map((c: {text?: string}) => c.text)
          .filter(Boolean)
          .join(' ') || ''
      return {title: 'Texto', subtitle: text.slice(0, 80) || '(vacío)'}
    },
  },
})
