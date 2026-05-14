import {defineField, defineType} from 'sanity'
import {TagsIcon} from '@sanity/icons'
import ProductColorSelect from '../../components/inputs/ProductColorSelect'

export default defineType({
  name: 'relatedColorGroup',
  title: 'Relacionados por color',
  type: 'object',
  icon: TagsIcon,
  fields: [
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
      description:
        'Valor de la opción "Color" del producto. Cuando el usuario abra la PDP con este color, se mostrarán estos productos relacionados en lugar de los globales.',
      components: {input: ProductColorSelect},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'products',
      title: 'Productos relacionados',
      type: 'array',
      of: [{type: 'productWithVariant'}],
      validation: (Rule) => Rule.max(10),
    }),
  ],
  preview: {
    select: {color: 'color', count: 'products.length'},
    prepare({color, count}: {color?: string; count?: number}) {
      return {
        title: color || '— sin color —',
        subtitle:
          typeof count === 'number' && count > 0
            ? `${count} producto${count === 1 ? '' : 's'}`
            : 'Sin productos',
      }
    },
  },
})
