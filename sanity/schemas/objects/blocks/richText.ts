// sanity/schemas/objects/blocks/richText.ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.richText',
  title: 'Texto rico',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'body',
      type: 'internationalizedArrayBody', // reuses existing block content schema
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {body: 'body'},
    prepare({body}) {
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
      return {title: 'Texto', subtitle: text.slice(0, 80) || '(vacío)'}
    },
  },
})
