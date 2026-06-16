// sanity/schemas/objects/blocks/downloadButton.ts
import {DownloadIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.downloadButton',
  title: 'Botón de descarga',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
    }),
    defineField({
      name: 'file',
      title: 'Archivo',
      type: 'file',
      options: {accept: '.pdf'},
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
    prepare({title, subtitle}) {
      return {title: title || 'Botón de descarga', subtitle: subtitle || 'PDF'}
    },
  },
})
