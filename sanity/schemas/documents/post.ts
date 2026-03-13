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
    }
  ],
  fields: [
    // Title
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    // Slug
    defineField({
        name: 'slug',
        type: 'slug',
        options: {source: 'title'},
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
      name: 'modulos',
      title: 'Módulos',
      type: 'array',
      of: [{type: 'post_block'}],
      group: 'editorial',
      hidden: ({parent}) => {
        const isElemental = parent?.category?._ref == "582a04a9-5b92-4c17-aec4-7c74faaf82ae"
        return !isElemental
      },
    }),
    defineField({
      name: 'content',
      title: 'Contenido',
      type: 'body',
      group: 'editorial',
      hidden: ({parent}) => {
        const isElemental = parent?.category?._ref == "582a04a9-5b92-4c17-aec4-7c74faaf82ae"
        return isElemental
      },
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
  ],
  preview: {
    select: {
      active: 'active',
      title: 'title',
      order: 'order',
    },
    prepare(selection) {
      let {title, order} = selection

      if (order) {
        title = `${order}. ${title}`
      } 
      
      return {
        title,
      }
    },
  },
})