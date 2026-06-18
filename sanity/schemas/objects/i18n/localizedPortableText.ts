import {defineType, defineField} from 'sanity'

export const localizedPortableText = defineType({
  name: 'localizedPortableText',
  title: 'Localized Portable Text',
  type: 'array',
  of: [
    defineField({
      name: 'value',
      type: 'object',
      fields: [
        {name: 'value', type: 'array', of: [{type: 'block'}]},
      ],
    }),
  ],
})
