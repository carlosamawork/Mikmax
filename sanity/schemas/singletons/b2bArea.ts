import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bArea',
  title: 'Área profesional B2B',
  type: 'document',
  fields: [
    defineField({name: 'intro', title: 'Introducción', type: 'internationalizedArrayBody'}),
    defineField({name: 'content', title: 'Contenido profesional', type: 'b2bAreaGroup'}),
  ],
  preview: {prepare: () => ({title: 'Área profesional B2B'})},
})
