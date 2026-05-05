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
    defineField({name: 'headline', title: 'Headline', type: 'string'}),
    defineField({name: 'subhead', title: 'Subheadline', type: 'text', rows: 2}),
    defineField({
      name: 'cta',
      title: 'CTA',
      type: 'object',
      fields: [
        defineField({name: 'label', type: 'string', title: 'Label'}),
        defineField({
          name: 'link',
          type: 'array',
          title: 'Link',
          of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
          validation: (Rule) => Rule.max(1),
        }),
      ],
    }),
    defineField({
      name: 'colorTheme',
      title: 'Tema',
      type: 'reference',
      to: [{type: 'colorTheme'}],
    }),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Hero campaña', subtitle: headline || '(sin headline)', media}
    },
  },
})
