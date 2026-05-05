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
      name: 'link',
      title: 'Link (opc)',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
      validation: (Rule) => Rule.max(1),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      options: {
        list: ['16:9', '4:5', '1:1', '3:4', '21:9'],
        layout: 'radio',
      },
      initialValue: '16:9',
    }),
    defineField({name: 'fullBleed', title: 'Full-bleed', type: 'boolean', initialValue: false}),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Campaña imagen/vídeo', subtitle: headline || '(sin headline)', media}
    },
  },
})
