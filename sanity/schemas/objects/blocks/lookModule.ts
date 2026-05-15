// sanity/schemas/objects/blocks/lookModule.ts
import {StackIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.lookModule',
  title: 'Módulo Look Books',
  type: 'object',
  icon: StackIcon,
  fields: [
    defineField({name: 'title', type: 'string'}),
    defineField({
      name: 'looks',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'look'}]}],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      options: {
        list: [
          {title: 'Fila ancha', value: 'row-wide'},
          {title: 'Grid 2 columnas', value: 'grid-2col'},
        ],
        layout: 'radio',
      },
      initialValue: 'row-wide',
    }),
  ],
  preview: {
    select: {title: 'title', count: 'looks.length'},
    prepare({title, count}) {
      return {title: title || 'Módulo Looks', subtitle: `${count || 0} looks`}
    },
  },
})
