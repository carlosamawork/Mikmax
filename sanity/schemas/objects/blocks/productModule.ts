// sanity/schemas/objects/blocks/productModule.ts
import {PackageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.productModule',
  title: 'Módulo de productos',
  type: 'object',
  icon: PackageIcon,
  fields: [
    defineField({name: 'title', title: 'Título', type: 'string'}),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Carrusel', value: 'carousel'},
          {title: 'Grid 4 columnas', value: 'grid-4col'},
          {title: 'Grid mixto', value: 'grid-mixed'},
        ],
        layout: 'radio',
      },
      initialValue: 'carousel',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Origen',
      type: 'string',
      options: {
        list: [
          {title: 'Manual', value: 'manual'},
          {title: 'Colección Shopify', value: 'collection'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'manualProducts',
      title: 'Productos (manual)',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'product'}]}],
      hidden: ({parent}) => parent?.source !== 'manual',
    }),
    defineField({
      name: 'collection',
      title: 'Colección',
      type: 'reference',
      to: [{type: 'collection'}],
      hidden: ({parent}) => parent?.source !== 'collection',
    }),
    defineField({
      name: 'limit',
      title: 'Límite (sólo si la fuente es colección)',
      type: 'number',
      validation: (Rule) => Rule.min(1).max(48),
      initialValue: 8,
      hidden: ({parent}) => parent?.source !== 'collection',
    }),
  ],
  preview: {
    select: {title: 'title', layout: 'layout', source: 'source'},
    prepare({title, layout, source}) {
      return {title: title || 'Módulo de productos', subtitle: `${source} · ${layout}`}
    },
  },
})
