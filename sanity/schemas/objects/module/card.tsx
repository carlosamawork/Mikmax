import React from 'react'
import {defineField} from 'sanity'
import ShopifyDocumentStatus from '../../../components/media/ShopifyDocumentStatus'

export default defineField({
  name: 'module.card',
  title: 'Tarjeta',
  type: 'document',
  fields: [
        {
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (Rule) => Rule.required(),
        },
        {
            name: 'category',
            title: 'Category',
            type: 'string',
        },
        {
            name: 'image',
            title: 'Imagen',
            type: 'image',
            options: {hotspot: true},
            validation: (Rule) => Rule.required(),
        },
        {
            name: 'url',
            title: 'Url',
            type: 'string',
        },
  ],
  preview: {
    select: {
        title: 'title',
        image: 'image'
    },
    prepare(selection) {
        const {title, image } = selection
      return {
        media: image,
        title,
      }
    },
  },
})