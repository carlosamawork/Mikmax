import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

export default defineField({
  name: 'newsletterPopup',
  title: 'Pop-up newsletter',
  type: 'object',
  icon: EnvelopeIcon,
  description: 'Modal de captación de newsletter. Aparece una vez por visitante tras un retardo.',
  options: {collapsed: false, collapsible: true},
  fields: [
    defineField({
      name: 'enabled',
      title: 'Activado',
      type: 'boolean',
      initialValue: false,
      description: 'Si está desactivado, el pop-up no se muestra.',
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string'})],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.parent as {enabled?: boolean})?.enabled
          if (enabled && !value) return 'Imagen requerida cuando el pop-up está activado.'
          return true
        }),
    }),
    defineField({
      name: 'heading',
      title: 'Título / oferta',
      type: 'string',
      description: 'P. ej. "Subscribe for 10% off your next order".',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.parent as {enabled?: boolean})?.enabled
          if (enabled && !value) return 'Título requerido cuando el pop-up está activado.'
          return true
        }),
    }),
    defineField({
      name: 'legalText',
      title: 'Texto legal',
      type: 'string',
      description:
        'Texto bajo el formulario. El enlace "privacy policy" (a /legal/privacy-policy) se añade automáticamente al final.',
    }),
    defineField({
      name: 'delaySeconds',
      title: 'Retardo (segundos)',
      type: 'number',
      initialValue: 10,
      validation: (Rule) => Rule.min(0),
    }),
  ],
})
