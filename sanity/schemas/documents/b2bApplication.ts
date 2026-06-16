import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'b2bApplication',
  title: 'Solicitud B2B',
  type: 'document',
  fields: [
    defineField({name: 'applicantName', title: 'Solicitante', type: 'string'}),
    defineField({name: 'companyName', title: 'Empresa', type: 'string'}),
    defineField({name: 'vatNumber', title: 'VAT / NIF', type: 'string'}),
    defineField({name: 'country', title: 'País', type: 'string'}),
    defineField({
      name: 'clientType',
      title: 'Tipo de cliente',
      type: 'string',
      options: {list: ['reseller', 'designer']},
    }),
    defineField({name: 'corporateEmail', title: 'Email corporativo', type: 'string'}),
    defineField({name: 'companyWebsite', title: 'Web', type: 'url'}),
    defineField({name: 'fiscalAddress', title: 'Dirección fiscal', type: 'text'}),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {list: ['pending', 'approved', 'rejected', 'more_info']},
      initialValue: 'pending',
    }),
    defineField({name: 'validationScore', title: 'Puntuación', type: 'number'}),
    defineField({name: 'internalNotes', title: 'Notas internas', type: 'text'}),
    defineField({name: 'shopifyCustomerId', title: 'Shopify Customer ID', type: 'string'}),
    defineField({name: 'createdAt', title: 'Creado', type: 'datetime'}),
    defineField({name: 'updatedAt', title: 'Actualizado', type: 'datetime'}),
    // Flag interno que escriben los botones del panel (Aprobar/Rechazar/Pedir info).
    // Un webhook firmado de Sanity lo procesa en /api/b2b/admin y luego lo limpia.
    defineField({
      name: 'adminAction',
      title: 'Acción admin (interna)',
      type: 'string',
      options: {list: ['approve', 'reject', 'more_info']},
      hidden: true,
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'companyName', subtitle: 'status'},
  },
})
