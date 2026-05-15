// sanity/schemas/objects/blocks/heroCampaign.ts
import {ImagesIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.heroCampaign',
  title: 'Hero campaña',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'slides',
      title: 'Slides (1 ó 2)',
      type: 'array',
      description:
        'Una imagen/vídeo a ancho completo, o dos lado a lado. Cada slide tiene su propio título y link.',
      validation: (Rule) => Rule.min(1).max(2),
      of: [
        {
          name: 'heroCampaignSlide',
          type: 'object',
          title: 'Slide',
          fields: [
            defineField({
              name: 'mediaType',
              title: 'Tipo de media',
              type: 'string',
              options: {
                list: [
                  {title: 'Imagen', value: 'image'},
                  {title: 'Vídeo', value: 'video'},
                ],
                layout: 'radio',
              },
              initialValue: 'image',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'image',
              title: 'Imagen',
              type: 'image',
              options: {hotspot: true},
              hidden: ({parent}) => parent?.mediaType !== 'image',
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
              name: 'video',
              title: 'Vídeo',
              type: 'object',
              hidden: ({parent}) => parent?.mediaType !== 'video',
              fields: [
                defineField({name: 'src', title: 'URL (mp4 o .m3u8)', type: 'url'}),
                defineField({name: 'posterAlt', title: 'Alt del poster', type: 'string'}),
                defineField({name: 'poster', title: 'Poster', type: 'image'}),
              ],
            }),
            defineField({
              name: 'title',
              title: 'Título',
              description:
                'Texto sobreimpuesto abajo a la izquierda de la imagen (ej. "Discover our Bedroom collection").',
              type: 'string',
            }),
            defineField({
              name: 'url',
              title: 'URL del slide',
              description:
                'Hace clicable la imagen entera. Acepta rutas relativas (`/shop/dormitorio`) o URLs absolutas (`https://…`).',
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
      return {title: 'Hero campaña', subtitle, media}
    },
  },
})
