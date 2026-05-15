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
      name: 'slides',
      title: 'Slides (1 ó 2)',
      type: 'array',
      description:
        'Una o dos imágenes lado a lado, cada una con un título sobreimpuesto abajo a la izquierda y un link opcional que hace clicable la imagen entera.',
      validation: (Rule) => Rule.min(1).max(2),
      of: [
        {
          name: 'featuredSlide',
          type: 'object',
          title: 'Slide',
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
              title: 'Título',
              description:
                'Texto sobreimpuesto abajo a la izquierda (ej. "Follow us on Instagram").',
              type: 'string',
            }),
            defineField({
              name: 'url',
              title: 'URL del slide',
              description:
                'Hace clicable la imagen entera. Acepta rutas relativas (`/about`) o URLs absolutas (`https://…`).',
              type: 'string',
            }),
          ],
          preview: {
            select: {title: 'title', media: 'image'},
            prepare({title, media}) {
              return {title: title || '(sin título)', media}
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {first: 'slides.0.title', second: 'slides.1.title', media: 'slides.0.image'},
    prepare({first, second, media}) {
      const subtitle = [first, second].filter(Boolean).join(' / ') || '(vacío)'
      return {title: 'Sección destacada', subtitle, media}
    },
  },
})
