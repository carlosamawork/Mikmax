// sanity/schemas/objects/bundle/bundleComponent.ts
import {ComponentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'bundleComponent',
  title: 'Bundle component',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'productVariant',
      title: 'Product variant',
      type: 'reference',
      to: [{type: 'productVariant'}],
      validation: (Rule) => Rule.required(),
      description:
        'Variante específica de Shopify. El color queda pre-bloqueado por la variante.',
    }),
    defineField({
      name: 'label',
      title: 'Label visible',
      type: 'string',
      description:
        'Override del título de la variante en la UI del bundle (ej. "Funda nórdica"). Si se deja vacío, usa el título de la variante.',
    }),
    defineField({
      name: 'availableSizes',
      title: 'Tallas disponibles',
      type: 'array',
      of: [{type: 'string'}],
      description:
        'Lista de tallas habilitadas para esta variante en el contexto del bundle.',
      validation: (Rule) => Rule.min(1),
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
      variantTitle: 'productVariant.store.title',
      sku: 'productVariant.store.sku',
    },
    prepare({label, variantTitle, sku}) {
      return {
        title: label || variantTitle || '(sin título)',
        subtitle: sku ? `SKU ${sku}` : 'Sin SKU sincronizado',
      }
    },
  },
})
