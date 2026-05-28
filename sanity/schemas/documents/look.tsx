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
      name: 'relatedProducts',
      title: 'Productos relacionados',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'product'}], weak: true}],
      group: 'editorial',
    }),
    defineField({
      name: 'discountStrategy',
      title: 'Estrategia de descuento',
      type: 'string',
      options: {
        list: [
          {title: 'Sin descuento', value: 'none'},
          {title: 'Resta cantidad fija (€) a la suma', value: 'sumMinusFixed'},
          {title: 'Resta % a la suma', value: 'sumMinusPercent'},
        ],
        layout: 'radio',
      },
      initialValue: 'none',
      validation: (Rule) => Rule.required(),
      group: 'pricing',
    }),
    defineField({
      name: 'discountValue',
      title: 'Valor de descuento',
      description:
        'Solo para mostrar en la página. "sumMinusFixed": € a restar. "sumMinusPercent": número 0-100. El cobro real lo impone el código de descuento de Shopify, manténlos alineados.',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'discountCode',
      title: 'Código de descuento de Shopify',
      description:
        'Código que se aplica al carrito al añadir el look (cartDiscountCodesUpdate). Debe coincidir con discountStrategy/discountValue.',
      type: 'string',
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
    select: {title: 'title', media: 'editorialImages.0.image'},
    prepare({title, media}) {
      return {title, subtitle: 'Look Book', media}
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
  ],
})
