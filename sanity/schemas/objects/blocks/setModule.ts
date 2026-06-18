// sanity/schemas/objects/blocks/setModule.ts
import {StackCompactIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {enText} from '../i18n/enText'

export default defineType({
  name: 'block.setModule',
  title: 'Módulo Set',
  type: 'object',
  icon: StackCompactIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtítulo',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'product',
      title: 'Producto (Set)',
      description: 'Producto de la colección Sets al que enlaza el módulo.',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Imágenes',
      type: 'array',
      validation: (Rule) => Rule.min(1),
      of: [
        {
          type: 'image',
          options: {hotspot: true, crop: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      media: 'images.0',
      productTitle: 'product.store.title',
    },
    prepare({title, subtitle, media, productTitle}) {
      return {
        title: enText(title as unknown) || 'Módulo Set',
        subtitle: enText(subtitle as unknown) || (productTitle ? `→ ${productTitle}` : 'Sin subtítulo'),
        media,
      }
    },
  },
})
