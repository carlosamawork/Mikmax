// sanity/schemas/objects/global/announcementBanner.ts
import {InfoOutlineIcon} from '@sanity/icons'
import {defineField} from 'sanity'

export default defineField({
  name: 'announcementBanner',
  title: 'Banner anuncio',
  type: 'object',
  icon: InfoOutlineIcon,
  description:
    'Tira fina de aviso que aparece encima del header en toda la web. El usuario puede cerrarla.',
  options: {collapsed: false, collapsible: true},
  fields: [
    defineField({
      name: 'enabled',
      title: 'Activado',
      type: 'boolean',
      initialValue: false,
      description: 'Si está desactivado, el banner no se renderiza.',
    }),
    defineField({
      name: 'text',
      title: 'Texto',
      type: 'string',
      description: 'Mensaje visible en el banner.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.parent as {enabled?: boolean})?.enabled
          if (enabled && !value) return 'Texto requerido cuando el banner está activado.'
          return true
        }),
    }),
    defineField({
      name: 'url',
      title: 'URL (opcional)',
      type: 'string',
      description:
        'Hace clicable la tira entera. Acepta rutas relativas (`/shop/dormitorio`) o URLs absolutas.',
    }),
  ],
  preview: {
    select: {enabled: 'enabled', text: 'text'},
    prepare({enabled, text}) {
      return {
        title: 'Banner anuncio',
        subtitle: enabled ? text || '(sin texto)' : '(desactivado)',
      }
    },
  },
})
