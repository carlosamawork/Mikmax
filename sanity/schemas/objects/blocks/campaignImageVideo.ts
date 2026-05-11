// sanity/schemas/objects/blocks/campaignImageVideo.ts
import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.campaignImageVideo',
  title: 'Imagen / vídeo de campaña',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'mediaType',
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
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.mediaType !== 'image',
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({
      name: 'video',
      type: 'object',
      hidden: ({parent}) => parent?.mediaType !== 'video',
      fields: [
        defineField({name: 'src', type: 'url'}),
        defineField({name: 'posterAlt', type: 'string'}),
        defineField({name: 'poster', type: 'image'}),
      ],
    }),
    defineField({name: 'headline', title: 'Headline (opc)', type: 'string'}),
    defineField({
      name: 'url',
      title: 'URL (opc)',
      type: 'string',
      description:
        'Hace clicable la imagen/vídeo entero. Acepta rutas relativas o URLs absolutas.',
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      options: {
        list: [
          {title: 'Auto (usa proporción natural de la imagen)', value: 'auto'},
          {title: '21:9 (panorámico)', value: '21:9'},
          {title: '16:9', value: '16:9'},
          {title: '3:2', value: '3:2'},
          {title: '4:5 (vertical)', value: '4:5'},
          {title: '1:1 (cuadrado)', value: '1:1'},
          {title: '3:4', value: '3:4'},
        ],
        layout: 'radio',
      },
      initialValue: '16:9',
    }),
    defineField({name: 'fullBleed', title: 'Full-bleed', type: 'boolean', initialValue: false}),
    defineField({
      name: 'narrow',
      title: 'Ancho reducido',
      type: 'boolean',
      description:
        'Centra el bloque con un ancho máximo (~1080 px). Útil para imágenes editoriales tipo lookbook.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Campaña imagen/vídeo', subtitle: headline || '(sin headline)', media}
    },
  },
})
