import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bArea',
  title: 'Área profesional B2B',
  type: 'document',
  fields: [
    defineField({name: 'intro', title: 'Introducción (compartida)', type: 'internationalizedArrayBody'}),
    defineField({name: 'reseller', title: 'Reseller', type: 'b2bAreaGroup'}),
    defineField({name: 'designer', title: 'Interior Designer', type: 'b2bAreaGroup'}),
  ],
  preview: {prepare: () => ({title: 'Área profesional B2B'})},
})
