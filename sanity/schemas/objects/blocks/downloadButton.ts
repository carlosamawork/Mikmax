// sanity/schemas/objects/blocks/downloadButton.ts
import {DownloadIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {enText} from '../i18n/enText'

export default defineType({
  name: 'block.downloadButton',
  title: 'Botón de descarga',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Imagen de fondo',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alt', type: 'string'})],
    }),
    defineField({
      name: 'title',
      title: 'Texto del botón',
      type: 'internationalizedArrayString',
      initialValue: 'Descargar',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'file',
      title: 'Archivo (PDF)',
      type: 'file',
      options: {accept: '.pdf'},
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
    prepare({title, subtitle}) {
      return {title: enText(title as unknown) || 'Botón de descarga', subtitle: enText(subtitle as unknown) || 'PDF'}
    },
  },
})
