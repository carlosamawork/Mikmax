// sanity/schemas/objects/blocks/setModule.ts
import {StackCompactIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.setModule',
  title: 'Módulo Sets',
  type: 'object',
  icon: StackCompactIcon,
  fields: [
    defineField({name: 'title', type: 'string'}),
    defineField({
      name: 'sets',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'set'}]}],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      options: {
        list: [
          {title: 'Fila mini', value: 'row-mini'},
          {title: 'Grid', value: 'grid'},
        ],
        layout: 'radio',
      },
      initialValue: 'row-mini',
    }),
  ],
  preview: {
    select: {title: 'title', count: 'sets.length'},
    prepare({title, count}) {
      return {title: title || 'Módulo Sets', subtitle: `${count || 0} sets`}
    },
  },
})
