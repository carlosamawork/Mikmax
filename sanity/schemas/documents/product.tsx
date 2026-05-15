import {TagIcon} from '@sanity/icons'
import pluralize from 'pluralize-esm'
import ShopifyIcon from '../../components/icons/Shopify'
import ProductHiddenInput from '../../components/inputs/ProductHidden'
import ShopifyDocumentStatus from '../../components/media/ShopifyDocumentStatus'
import {defineField, defineType} from 'sanity'
import {getPriceRange} from '../../utils/getPriceRange'

const GROUPS = [
  {
    name: 'editorial',
    title: 'Editorial',
    default: true,
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
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: TagIcon,
  groups: GROUPS,
  fields: [
    defineField({
      name: 'hidden',
      type: 'string',
      components: {
        field: ProductHiddenInput,
      },
      group: GROUPS.map((group) => group.name),
      hidden: ({parent}) => {
        const isActive = parent?.store?.status === 'active'
        const isDeleted = parent?.store?.isDeleted
        return !parent?.store || (isActive && !isDeleted)
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
    defineField({
      name: 'propiedadesMaterial',
      title: 'Propiedades del material',
      type: 'body',
      group: 'editorial',
    }),
    defineField({
      name: 'recomendacionesLavado',
      title: 'Recomendaciones de lavado',
      type: 'body',
      group: 'editorial',
    }),
    defineField({
      name: 'usoRecomendado',
      title: 'Uso recomendado',
      type: 'body',
      group: 'editorial',
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products (default)',
      description:
        'Lista por defecto que se muestra cuando el color seleccionado en la PDP no tiene su propio grupo en "Relacionados por color". Máx 10. Por cada item elige producto + variante de color (si el producto tiene color).',
      type: 'array',
      of: [{type: 'productWithVariant'}],
      group: 'editorial',
      validation: (Rule) => Rule.max(10),
    }),
    defineField({
      name: 'relatedByColor',
      title: 'Relacionados por color',
      description:
        'Override por color. Si un color tiene su propio grupo, esos productos sustituyen a los "Related products" globales cuando el usuario abra la PDP con ese color. Si no hay grupo para un color, se usa la lista por defecto.',
      type: 'array',
      of: [{type: 'relatedColorGroup'}],
      group: 'editorial',
      validation: (Rule) =>
        Rule.custom((value?: {color?: string}[]) => {
          if (!Array.isArray(value)) return true
          const colors = value
            .map((g) => g?.color?.trim().toLowerCase())
            .filter((c): c is string => Boolean(c))
          const dupes = colors.filter((c, i) => colors.indexOf(c) !== i)
          return dupes.length === 0 || `Color duplicado: ${dupes.join(', ')}`
        }),
    }),
    defineField({
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
    }),
    defineField({
      name: 'store',
      title: 'Shopify',
      type: 'shopifyProduct',
      description: 'Product data from Shopify (read-only)',
      group: 'shopifySync',
    }),
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
    {
      name: 'priceDesc',
      title: 'Price (Highest first)',
      by: [{field: 'store.priceRange.minVariantPrice', direction: 'desc'}],
    },
    {
      name: 'priceAsc',
      title: 'Price (Lowest first)',
      by: [{field: 'store.priceRange.minVariantPrice', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      isDeleted: 'store.isDeleted',
      options: 'store.options',
      previewImageUrl: 'store.previewImageUrl',
      priceRange: 'store.priceRange',
      status: 'store.status',
      title: 'store.title',
      variants: 'store.variants',
    },
    prepare(selection) {
      const {isDeleted, options, previewImageUrl, priceRange, status, title, variants} = selection

      const optionCount = options?.length
      const variantCount = variants?.length

      let description = [
        variantCount ? pluralize('variant', variantCount, true) : 'No variants',
        optionCount ? pluralize('option', optionCount, true) : 'No options',
      ]

      let subtitle = getPriceRange(priceRange)
      if (status !== 'active') {
        subtitle = '(Unavailable in Shopify)'
      }
      if (isDeleted) {
        subtitle = '(Deleted from Shopify)'
      }

      return {
        description: description.join(' / '),
        subtitle,
        title,
        media: (
          <ShopifyDocumentStatus
            isActive={status === 'active'}
            isDeleted={isDeleted}
            type="product"
            url={previewImageUrl}
            title={title}
          />
        ),
      }
    },
  },
})
