// sanity/schemas/documents/set.tsx
import {StackCompactIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

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
    defineField({name: 'title', type: 'string', validation: (Rule) => Rule.required(), group: 'editorial'}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({name: 'description', type: 'text', rows: 3, group: 'editorial'}),
    defineField({
      name: 'editorialImages',
      type: 'array',
      of: [{type: 'module.image'}],
      validation: (Rule) => Rule.min(1),
      group: 'editorial',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del set)',
      type: 'array',
      of: [{type: 'bundleComponent'}],
      validation: (Rule) => Rule.min(2),
      group: 'editorial',
    }),
    defineField({
      name: 'colorLocked',
      title: 'Color cerrado del set',
      type: 'string',
      description:
        'Color común a todos los componentes (ej. "Azul", "Crudo"). Se muestra como subtítulo del set.',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({name: 'priceFixed', title: 'Precio fijo (€)', type: 'number', validation: (Rule) => Rule.required().min(0), group: 'pricing'}),
    defineField({name: 'priceCompareAt', title: 'Precio "antes" (€)', type: 'number', validation: (Rule) => Rule.min(0), group: 'pricing'}),
    defineField({
      name: 'discountStrategy',
      type: 'string',
      options: {
        list: [
          {title: 'Resta cantidad fija a la suma', value: 'sumMinusFixed'},
          {title: 'Resta % a la suma', value: 'sumMinusPercent'},
          {title: 'Override: total cerrado', value: 'overrideTotal'},
        ],
        layout: 'radio',
      },
      initialValue: 'overrideTotal',
      validation: (Rule) => Rule.required(),
      group: 'pricing',
    }),
    defineField({name: 'discountValue', type: 'number', validation: (Rule) => Rule.min(0), group: 'pricing'}),
    defineField({name: 'seo', type: 'seo.page', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', color: 'colorLocked', price: 'priceFixed', media: 'editorialImages.0.image'},
    prepare({title, color, price, media}) {
      return {
        title,
        subtitle: [color, price ? `€${price}` : null].filter(Boolean).join(' · '),
        media,
      }
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
  ],
})
