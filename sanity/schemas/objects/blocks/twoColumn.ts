import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.twoColumn',
  title: 'Módulo 2 columnas',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: 'left',
      title: 'Columna izquierda',
      type: 'twoColumnCell',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'right',
      title: 'Columna derecha',
      type: 'twoColumnCell',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {leftKind: 'left.kind', rightKind: 'right.kind', media: 'left.image'},
    prepare({leftKind, rightKind, media}) {
      const label = (k?: string) => (k === 'media' ? 'media' : 'texto')
      return {title: 'Módulo 2 columnas', subtitle: `${label(leftKind)} | ${label(rightKind)}`, media}
    },
  },
})
