// sanity/schemas/documents/set.tsx
import {StackCompactIcon} from '@sanity/icons'
import {defineField, defineType, type SanityDocument} from 'sanity'

const GROUPS = [
  {name: 'editorial', title: 'Editorial', default: true},
  {name: 'pricing', title: 'Pricing & Discount'},
  {name: 'seo', title: 'SEO'},
]

export default defineType({
  name: 'set',
  title: 'Set',
  type: 'document',
  icon: StackCompactIcon,
  groups: GROUPS,
  fields: [
    defineField({
      name: 'title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: (doc: SanityDocument) => {
          const title = doc.title as {_key: string; value?: string}[] | undefined
          return title?.find((t) => t._key === 'en')?.value ?? ''
        },
      },
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'colorLocked',
      title: 'Color cerrado',
      type: 'string',
      description:
        'Color del set (p. ej. "Blanc de Blanc", "Terracota"). Informativo / agrupación en el archive.',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'internationalizedArrayText',
      group: 'editorial',
    }),
    defineField({
      name: 'propiedadesMaterial',
      title: 'Propiedades del material',
      type: 'internationalizedArrayBody',
      group: 'editorial',
    }),
    defineField({
      name: 'recomendacionesLavado',
      title: 'Recomendaciones de lavado',
      type: 'internationalizedArrayBody',
      group: 'editorial',
    }),
    defineField({
      name: 'usoRecomendado',
      title: 'Uso recomendado',
      type: 'internationalizedArrayBody',
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
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
      hidden: true,
      description: 'Posición manual asignada desde la vista "Ordenar sets".',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del set)',
      description:
        'Cada componente es un producto de Shopify con un color fijo. El usuario solo elige talla; las tallas se toman de Shopify.',
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
        'Código que se aplica al carrito al añadir el set (cartDiscountCodesUpdate). Debe coincidir con discountStrategy/discountValue.',
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
      const displayTitle = Array.isArray(title)
        ? (title.find((t: {_key: string; value?: string}) => t._key === 'en')?.value ?? title[0]?.value ?? '')
        : title
      return {title: displayTitle, subtitle: 'Set', media}
    },
  },
  // NOTE: ordering by `title` on a localized array field is a Studio-only
  // degradation (sorts by array reference, not extracted value). Deferred.
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
  ],
})
