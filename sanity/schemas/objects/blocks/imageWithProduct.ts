// sanity/schemas/objects/blocks/imageWithProduct.ts
import {SunIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.imageWithProduct',
  title: 'Imagen + Producto destacado',
  type: 'object',
  icon: SunIcon,
  fields: [
    defineField({
      name: 'feature',
      title: 'Imagen destacada',
      type: 'object',
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'image',
          title: 'Imagen',
          type: 'image',
          options: {hotspot: true},
          validation: (Rule) => Rule.required(),
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt',
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
        defineField({
          name: 'title',
          title: 'Título overlay',
          description:
            'Texto sobreimpuesto abajo a la izquierda (ej. "Discover our new arrivals").',
          type: 'string',
        }),
        defineField({
          name: 'url',
          title: 'URL',
          description:
            'Hace clicable la imagen entera. Acepta rutas relativas (`/about`) o URLs absolutas.',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'product',
      title: 'Producto destacado',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'imagePosition',
      title: 'Posición de la imagen',
      type: 'string',
      options: {
        list: [
          {title: 'Izquierda', value: 'left'},
          {title: 'Derecha', value: 'right'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'left',
    }),
  ],
  preview: {
    select: {
      title: 'feature.title',
      productTitle: 'product.store.title',
      media: 'feature.image',
    },
    prepare({title, productTitle, media}) {
      return {
        title: title || '(sin título)',
        subtitle: productTitle ? `+ ${productTitle}` : '+ producto',
        media,
      }
    },
  },
})
