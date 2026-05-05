// sanity/schemas/objects/blocks/bannerDescuento.ts
import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.bannerDescuento',
  title: 'Banner de descuento',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Texto',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'link',
      title: 'Link (opcional)',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
      validation: (Rule) => Rule.max(1),
    }),
    defineField({
      name: 'colorTheme',
      title: 'Tema',
      type: 'reference',
      to: [{type: 'colorTheme'}],
    }),
  ],
  preview: {
    select: {text: 'text'},
    prepare({text}) {
      return {title: 'Banner descuento', subtitle: text}
    },
  },
})
