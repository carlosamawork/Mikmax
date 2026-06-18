// sanity/schemas/objects/global/footer.ts
import {defineField} from 'sanity'

export default defineField({
  name: 'footerSettings',
  title: 'Footer',
  type: 'object',
  options: {collapsed: false, collapsible: true},
  fields: [
    // Newsletter ─────────────────────────────────────────────
    defineField({
      name: 'newsletter',
      title: 'Newsletter',
      type: 'object',
      options: {collapsed: false, collapsible: true},
      fields: [
        defineField({
          name: 'title',
          type: 'internationalizedArrayString',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'body',
          type: 'internationalizedArrayText',
          description: 'Texto introductorio del newsletter.',
        }),
        defineField({
          name: 'placeholder',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'buttonLabel',
          type: 'internationalizedArrayString',
        }),
      ],
    }),

    // Columnas ───────────────────────────────────────────────
    defineField({
      name: 'columns',
      title: 'Columnas del footer',
      type: 'array',
      description: 'Cada columna se renderiza como un bloque con título y enlaces.',
      of: [
        // Columna libre (links manuales)
        {
          name: 'footerColumn',
          type: 'object',
          title: 'Columna (links manuales)',
          fields: [
            defineField({
              name: 'title',
              type: 'internationalizedArrayString',
            }),
            defineField({
              name: 'links',
              type: 'array',
              of: [{type: 'linkInternal'}, {type: 'linkExternal'}, {type: 'object', name: 'space', fields: [ {type: 'string', name: 'blank'}]}],
            }),
          ],
          preview: {
            select: {title: 'title', count: 'links.length'},
            prepare({title, count}) {
              const label = Array.isArray(title) ? (title[0]?.value ?? '(sin título)') : (title ?? '(sin título)')
              return {title: label, subtitle: `${count || 0} links`}
            },
          },
        },
        // Columna Shop (auto desde colecciones padre + extras)
        {
          name: 'footerColumnShop',
          type: 'object',
          title: 'Columna Shop (auto)',
          fields: [
            defineField({
              name: 'title',
              type: 'internationalizedArrayString',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'extraLinks',
              title: 'Links extra (opcional)',
              type: 'array',
              description:
                'Se añaden al final, debajo de las colecciones padre (ej. "Retailers").',
              of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
            }),
          ],
          preview: {
            select: {title: 'title'},
            prepare({title}) {
              const label = Array.isArray(title) ? (title[0]?.value ?? 'Shop') : (title ?? 'Shop')
              return {
                title: label,
                subtitle: 'Colecciones padre (auto) + extras',
              }
            },
          },
        },
        // Columna Social Media
        {
          name: 'footerColumnSocial',
          type: 'object',
          title: 'Columna Social Media',
          fields: [
            defineField({
              name: 'title',
              type: 'internationalizedArrayString',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'links',
              type: 'array',
              of: [{type: 'linkSocial'}],
              validation: (Rule) => Rule.min(1),
            }),
          ],
          preview: {
            select: {title: 'title', count: 'links.length'},
            prepare({title, count}) {
              const label = Array.isArray(title) ? (title[0]?.value ?? 'Social') : (title ?? 'Social')
              return {title: label, subtitle: `${count || 0} redes`}
            },
          },
        },
      ],
    }),

    // Regiones ───────────────────────────────────────────────
    defineField({
      name: 'regions',
      title: 'Regiones / monedas',
      type: 'array',
      description:
        'Países disponibles en el selector inferior derecho. La región por defecto se aplica al cargar la web.',
      of: [
        {
          name: 'region',
          type: 'object',
          fields: [
            defineField({
              name: 'code',
              title: 'Código país (ISO)',
              type: 'string',
              description: 'Ej. ES, FR, US.',
              validation: (Rule) => Rule.required().min(2).max(2),
            }),
            defineField({
              name: 'label',
              title: 'Nombre visible',
              type: 'internationalizedArrayString',
              description: 'Ej. España, France, United States.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'currency',
              title: 'Moneda (ISO 4217)',
              type: 'string',
              description: 'Ej. EUR, USD, GBP.',
              validation: (Rule) => Rule.required().min(3).max(3),
            }),
            defineField({
              name: 'isDefault',
              title: 'Por defecto',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {
            select: {label: 'label', currency: 'currency', code: 'code', isDefault: 'isDefault'},
            prepare({label, currency, code, isDefault}) {
              const displayLabel = Array.isArray(label) ? (label[0]?.value ?? code) : (label ?? code)
              return {
                title: `${displayLabel} (${currency})`,
                subtitle: `${code}${isDefault ? ' · default' : ''}`,
              }
            },
          },
        },
      ],
    }),
  ],
})
