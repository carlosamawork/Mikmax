import {DocumentIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {validateSlug} from '../../utils/validateSlug'

export default defineField({
  name: 'post',
  title: 'Posts',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    {
      default: true,
      name: 'editorial',
      title: 'Editorial',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],
  fields: [
    // Title
    defineField({
      name: 'title',
      title: 'Title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    // Slug
    defineField({
        name: 'slug',
        type: 'slug',
        options: {
          source: (doc) => {
            const title = doc?.title as
              | {_key: string; value?: string}[]
              | undefined
            return title?.find((t) => t._key === 'en')?.value ?? ''
          },
        },
        // @ts-ignore - TODO - fix this TS error
        validation: validateSlug,
        group: 'editorial',
    }),
    defineField({
      name: 'image',
      title: 'Imagen destacada',
      type: 'image',
      options: {hotspot: true},
      // @ts-ignore - TODO - fix this TS error
      group: 'editorial',
    }),
    defineField({
        name: "category",
        title: "Categoría",
        type: "reference",
        group: 'editorial',
        validation: Rule => Rule.required(),
        to: [{ type: "category" }],
    }),
    defineField({
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
    }),
    defineField({
      name: 'content',
      title: 'Contenido',
      type: 'internationalizedArrayBody',
      group: 'editorial',
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: 'editorial',
      of: [
        {
          name: "tag",
          type: "reference",
          to: [{ type: "postTag" }],
        },
      ],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "related",
      title: "Relacionados",
      type: "array",
      group: 'editorial',
      validation: (Rule) => Rule.min(1),
      of: [
        {
          name: "productElement",
          type: "reference",
          to: [{ type: "product" }],
        },
        {
          name: "postElement",
          type: "reference",
          to: [{ type: "post" }],
        },
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      active: 'active',
      title: 'title',
      order: 'order',
    },
    prepare(selection) {
      let {title, order} = selection

      const titleText =
        (Array.isArray(title)
          ? title.find((t) => t._key === 'en')?.value
          : title) ?? ''

      let displayTitle = titleText

      if (order) {
        displayTitle = `${order}. ${displayTitle}`
      }

      return {
        title: displayTitle,
      }
    },
  },
})