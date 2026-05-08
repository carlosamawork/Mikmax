// sanity/schemas/objects/blocks/featuredSection.ts
import {StarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.featuredSection',
  title: 'Sección destacada',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({name: 'headline', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'body',
      type: 'array',
      of: [{type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: []}],
    }),
    defineField({
      name: 'cta',
      type: 'object',
      fields: [
        defineField({name: 'label', type: 'string'}),
        defineField({
          name: 'url',
          type: 'string',
          description: 'Acepta rutas relativas o URLs absolutas.',
        }),
      ],
    }),
    defineField({
      name: 'mediaPosition',
      type: 'string',
      options: {
        list: [
          {title: 'Izquierda', value: 'left'},
          {title: 'Derecha', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'left',
    }),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Sección destacada', subtitle: headline, media}
    },
  },
})
