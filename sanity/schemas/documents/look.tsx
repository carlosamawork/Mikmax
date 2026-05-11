// sanity/schemas/documents/look.tsx
import {StackIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const GROUPS = [
  {name: 'editorial', title: 'Editorial', default: true},
  {name: 'pricing', title: 'Pricing & Discount'},
  {name: 'seo', title: 'SEO'},
]

export default defineType({
  name: 'look',
  title: 'Look Book',
  type: 'document',
  icon: StackIcon,
  groups: GROUPS,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      group: 'editorial',
    }),
    defineField({
      name: 'editorialImages',
      title: 'Imágenes editoriales',
      type: 'array',
      of: [{type: 'module.image'}],
      validation: (Rule) => Rule.min(1),
      group: 'editorial',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del look)',
      description:
        'Cada componente es una variante específica de Shopify. El usuario solo elige talla; el color queda pre-bloqueado por la variante.',
      type: 'array',
      of: [{type: 'bundleComponent'}],
      validation: (Rule) => Rule.min(2),
      group: 'editorial',
    }),
    defineField({
      name: 'priceFixed',
      title: 'Precio fijo (€)',
      type: 'number',
      description:
        'Precio del look completo. Es la base que cobra Shopify cuando no hay descuento de bundle aplicado.',
      validation: (Rule) => Rule.required().min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'priceCompareAt',
      title: 'Precio "antes" tachado (€) — opcional',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'discountStrategy',
      title: 'Estrategia de descuento',
      type: 'string',
      options: {
        list: [
          {title: 'Resta cantidad fija a la suma de componentes', value: 'sumMinusFixed'},
          {title: 'Resta % a la suma de componentes', value: 'sumMinusPercent'},
          {title: 'Override: total cerrado (ignora la suma)', value: 'overrideTotal'},
        ],
        layout: 'radio',
      },
      initialValue: 'overrideTotal',
      validation: (Rule) => Rule.required(),
      group: 'pricing',
    }),
    defineField({
      name: 'discountValue',
      title: 'Valor de descuento',
      description:
        'Si la estrategia es "sumMinusFixed": cantidad en €. Si es "sumMinusPercent": número entre 0 y 100. Si es "overrideTotal": no se usa (se ignora).',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
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
      title: 'title',
      price: 'priceFixed',
      media: 'editorialImages.0.image',
    },
    prepare({title, price, media}) {
      return {
        title,
        subtitle: price ? `€${price}` : 'Sin precio',
        media,
      }
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
    {name: 'priceDesc', title: 'Precio (mayor primero)', by: [{field: 'priceFixed', direction: 'desc'}]},
  ],
})
