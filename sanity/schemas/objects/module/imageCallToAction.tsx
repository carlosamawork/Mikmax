import {defineField} from 'sanity'

export default defineField({
  name: 'imageCallToAction',
  title: 'Call to action',
  type: 'object',
  fields: [
    // Title
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    // Link
    {
      name: 'url',
      title: 'URL',
      type: 'string',
      description: 'Acepta rutas relativas o URLs absolutas.',
    },
  ],
})
