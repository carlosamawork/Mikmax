import {defineField, defineType} from 'sanity'
import {enText} from './i18n/enText'

export default defineType({
  name: 'twoColumnCell',
  title: 'Celda',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Tipo de celda',
      type: 'string',
      options: {
        list: [
          {title: 'Texto', value: 'text'},
          {title: 'Imagen / vídeo', value: 'media'},
        ],
        layout: 'radio',
      },
      initialValue: 'text',
      validation: (Rule) => Rule.required(),
    }),
    // --- Texto ---
    defineField({
      name: 'body',
      title: 'Texto',
      type: 'internationalizedArrayBody',
      hidden: ({parent}) => parent?.kind !== 'text',
    }),
    // --- Media ---
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
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.kind !== 'media' || parent?.mediaType !== 'image',
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({
      name: 'video',
      title: 'Vídeo',
      type: 'object',
      hidden: ({parent}) => parent?.kind !== 'media' || parent?.mediaType !== 'video',
      fields: [
        defineField({name: 'src', type: 'url'}),
        defineField({name: 'posterAlt', type: 'string'}),
        defineField({name: 'poster', type: 'image'}),
      ],
    }),
    defineField({
      name: 'caption',
      title: 'Rótulo (opc)',
      type: 'internationalizedArrayString',
      description: 'Texto superpuesto sobre la imagen/vídeo. Vacío = sin rótulo.',
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'captionTheme',
      title: 'Color del rótulo',
      type: 'string',
      options: {
        list: [
          {title: 'Claro (blanco)', value: 'light'},
          {title: 'Oscuro (negro)', value: 'dark'},
        ],
        layout: 'radio',
      },
      initialValue: 'light',
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'url',
      title: 'URL (opc)',
      type: 'string',
      description: 'Hace clicable la celda entera. Acepta rutas internas (/...) o URLs http(s).',
      validation: (Rule) =>
        Rule.custom((value?: string) => {
          if (!value) return true
          if (value.startsWith('/') && !value.startsWith('//')) return true
          if (/^https?:\/\//i.test(value)) return true
          return 'Usa una ruta interna (/...) o una URL http(s)://'
        }),
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
  ],
  preview: {
    select: {kind: 'kind', caption: 'caption', media: 'image', body: 'body'},
    prepare({kind, caption, media, body}) {
      if (kind === 'media') {
        return {title: 'Celda media', subtitle: enText(caption as unknown) || '(sin rótulo)', media}
      }
      // body is internationalizedArrayBody: [{_key:'en', value:[blocks...]}, ...]
      const bodyArr = body as {_key?: string; value?: unknown}[] | null
      const langEntry = Array.isArray(bodyArr)
        ? (bodyArr.find((v) => v?._key === 'en') ?? bodyArr[0])
        : null
      const blocks = Array.isArray(langEntry?.value) ? (langEntry.value as {children?: {text?: string}[]}[]) : []
      const firstBlock = blocks[0] ?? null
      const text =
        firstBlock?.children
          ?.map((c: {text?: string}) => c.text)
          .filter(Boolean)
          .join(' ') || ''
      return {title: 'Celda texto', subtitle: text.slice(0, 60) || '(vacío)'}
    },
  },
})
