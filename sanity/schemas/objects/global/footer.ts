import {defineField} from 'sanity'

export default defineField({
  name: 'footerSettings',
  title: 'Footer',
  type: 'object',
  options: {
    collapsed: false,
    collapsible: true,
  },
  fields: [
    // Links
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
    }),
    defineField({
      name: 'linksSocial',
      title: 'Links Social',
      type: 'array',
      of: [{type: 'linkSocial'}],
    }),
    defineField({
      name: 'linksTerms',
      title: 'Links Políticas',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
    }),
    defineField({
      name: 'socialModule',
      title: 'Módulo Social',
      type: 'array',
      of: [{type: 'linkSocial'}],
    }),
    // Text
    defineField({
      name: 'text',
      title: 'Text',
      type: 'array',
      of: [
        {
          lists: [],
          marks: {
            annotations: [
              // Email
              {
                title: 'Email',
                name: 'annotationLinkEmail',
                type: 'annotationLinkEmail',
              },
              // Internal link
              {
                title: 'Internal page',
                name: 'annotationLinkInternal',
                type: 'annotationLinkInternal',
              },
              // URL
              {
                title: 'URL',
                name: 'annotationLinkExternal',
                type: 'annotationLinkExternal',
              },
            ],
            decorators: [],
          },
          // Block styles
          styles: [{title: 'Normal', value: 'normal'}],
          type: 'block',
        },
      ],
    }),
  ],
})
