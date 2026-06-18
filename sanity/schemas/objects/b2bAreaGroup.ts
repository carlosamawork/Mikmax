import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bAreaGroup',
  title: 'Condiciones de grupo',
  type: 'object',
  fields: [
    defineField({
      name: 'commercialPolicy',
      title: 'Política comercial',
      type: 'internationalizedArrayBody',
    }),
    defineField({
      name: 'purchaseConditions',
      title: 'Condiciones de compra',
      type: 'internationalizedArrayBody',
    }),
    defineField({
      name: 'taxInfo',
      title: 'Fiscalidad / exención IVA',
      type: 'internationalizedArrayBody',
    }),
    defineField({name: 'contactName', title: 'Contacto comercial (nombre)', type: 'string'}),
    defineField({name: 'contactEmail', title: 'Contacto comercial (email)', type: 'string'}),
  ],
})
