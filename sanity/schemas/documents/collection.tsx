import React from 'react'
import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import pluralize from 'pluralize-esm'
import CollectionHiddenInput from '../../components/inputs/CollectionHidden'
import ShopifyIcon from '../../components/icons/Shopify'
import ShopifyDocumentStatus from '../../components/media/ShopifyDocumentStatus'

const GROUPS = [
  {
    default: true,
    name: 'editorial',
    title: 'Editorial',
  },
  {
    name: 'shopifySync',
    title: 'Shopify sync',
    icon: ShopifyIcon,
  },
  {
    name: 'seo',
    title: 'SEO',
  },
]

export default defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  icon: PackageIcon,
  groups: GROUPS,
  fields: [
    // Product hidden status
    defineField({
      name: 'hidden',
      type: 'string',
      components: {
        field: CollectionHiddenInput,
      },
      hidden: ({parent}) => {
        const isDeleted = parent?.store?.isDeleted
        return !isDeleted
      },
    }),
    // // Title (proxy)
    // defineField({
    //   name: 'titleProxy',
    //   title: 'Title',
    //   type: 'proxyString',
    //   options: {field: 'store.title'},
    // }),
    // // Slug (proxy)
    // defineField({
    //   name: 'slugProxy',
    //   title: 'Slug',
    //   type: 'proxyString',
    //   options: {field: 'store.slug.current'},
    // }),
    // Parent collection (jerarquía editorial — se gestiona solo en Sanity)
    defineField({
      name: 'parent',
      title: 'Colección padre',
      type: 'reference',
      to: [{type: 'collection'}],
      weak: true,
      description:
        'Permite agrupar colecciones en jerarquía (ej. "Manteles" hija de "Mesa"). Opcional. Shopify no se entera de este vínculo: es solo navegacional.',
      group: 'editorial',
      options: {
        filter: ({document}) => {
          const id = (document?._id ?? '').replace(/^drafts\./, '')
          if (!id) return {filter: ''}
          return {
            filter: '_id != $id && _id != $draftId',
            params: {id, draftId: `drafts.${id}`},
          }
        },
      },
    }),
    // Orden manual (orderable plugin)
    defineField({
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
      hidden: true,
      description: 'Posición manual asignada desde la vista "Ordenar colecciones".',
    }),
    // Featured editorial images (Vista 2 only)
    defineField({
      name: 'imagenesDestacadas',
      title: 'Imágenes destacadas',
      type: 'array',
      description:
        'Imágenes editoriales que se intercalan dentro del listado de productos. Solo se muestran en la Vista 2 de la página de colección.',
      of: [{type: 'module.image'}],
      group: 'editorial',
    }),
    // Shopify collection
    defineField({
      name: 'store',
      title: 'Shopify',
      type: 'shopifyCollection',
      description: 'Collection data from Shopify (read-only)',
      group: 'shopifySync',
    }),
    // SEO
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.shopify',
      group: 'seo',
    }),
  ],
  orderings: [
    {
      name: 'titleAsc',
      title: 'Title (A-Z)',
      by: [{field: 'store.title', direction: 'asc'}],
    },
    {
      name: 'titleDesc',
      title: 'Title (Z-A)',
      by: [{field: 'store.title', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      imageUrl: 'store.imageUrl',
      isDeleted: 'store.isDeleted',
      rules: 'store.rules',
      title: 'store.title',
    },
    prepare(selection) {
      const {imageUrl, isDeleted, rules, title} = selection
      const ruleCount = rules?.length || 0

      return {
        media: (
          <ShopifyDocumentStatus
            isDeleted={isDeleted}
            type="collection"
            url={imageUrl}
            title={title}
          />
        ),
        subtitle: ruleCount > 0 ? `Automated (${pluralize('rule', ruleCount, true)})` : 'Manual',
        title,
      }
    },
  },
})
