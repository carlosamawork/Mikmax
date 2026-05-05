// sanity/schemas/objects/global/menu.ts
import {defineField} from 'sanity'

export default defineField({
  name: 'menuSettings',
  title: 'Menu',
  type: 'object',
  options: {collapsed: false, collapsible: true},
  fields: [
    defineField({
      name: 'links',
      title: 'Links principales',
      type: 'array',
      of: [
        {type: 'linkInternal'},
        {type: 'linkExternal'},
        // Mega-menu group: a labeled column of sub-links + optional featured product
        {
          name: 'menuGroup',
          type: 'object',
          title: 'Grupo (mega-menú)',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'items',
              type: 'array',
              of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
              validation: (Rule) => Rule.min(1),
            }),
            defineField({
              name: 'featuredProduct',
              type: 'reference',
              to: [{type: 'product'}],
              description: 'Producto destacado mostrado en el slot del mega-menú.',
            }),
          ],
          preview: {
            select: {title: 'label', count: 'items.length'},
            prepare({title, count}) {
              return {title: title || '(sin label)', subtitle: `${count || 0} items`}
            },
          },
        },
      ],
    }),
  ],
})
