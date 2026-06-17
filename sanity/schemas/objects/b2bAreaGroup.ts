import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bAreaGroup',
  title: 'Condiciones de grupo',
  type: 'object',
  fields: [
    defineField({name: 'commercialPolicy', title: 'Política comercial', type: 'body'}),
    defineField({name: 'purchaseConditions', title: 'Condiciones de compra', type: 'body'}),
    defineField({name: 'taxInfo', title: 'Fiscalidad / exención IVA', type: 'body'}),
    defineField({name: 'contactName', title: 'Contacto comercial (nombre)', type: 'string'}),
    defineField({name: 'contactEmail', title: 'Contacto comercial (email)', type: 'string'}),
  ],
})
