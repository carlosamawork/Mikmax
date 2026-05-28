import {ComponentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import BundleColorSelect from '../../../components/inputs/BundleColorSelect'

export default defineType({
  name: 'bundleComponent',
  title: 'Bundle component',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'product',
      title: 'Producto',
      type: 'reference',
      to: [{type: 'product'}],
      weak: true,
      validation: (Rule) => Rule.required(),
      description:
        'Producto de Shopify. Elige el color abajo; las tallas se toman automáticamente de Shopify.',
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
      components: {input: BundleColorSelect},
      validation: (Rule) => Rule.required(),
      description:
        'Color del producto para este look (queda fijo). El cliente solo elegirá talla.',
    }),
    defineField({
      name: 'label',
      title: 'Label visible',
      type: 'string',
      description:
        'Override del título del producto en la UI del bundle. Si se deja vacío, usa el título del producto.',
    }),
    defineField({
      name: 'notes',
      title: 'Notas internas',
      type: 'string',
      description: 'Notas para editores. No se muestran en frontend.',
    }),
  ],
  preview: {
    select: {
      label: 'label',
      productTitle: 'product.store.title',
      color: 'color',
    },
    prepare({label, productTitle, color}) {
      return {
        title: label || productTitle || '(sin producto)',
        subtitle: color ? `Color: ${color}` : 'Sin color',
      }
    },
  },
})
