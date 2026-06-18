import {defineType, defineField} from 'sanity'

export const localizedPortableText = defineType({
  name: 'localizedPortableText',
  type: 'array',
  of: [
    defineField({
      name: 'value',
      type: 'object',
      fields: [
        {name: '_key', type: 'string', readOnly: true},
        {name: 'value', type: 'array', of: [{type: 'block'}]},
      ],
    }),
  ],
})
