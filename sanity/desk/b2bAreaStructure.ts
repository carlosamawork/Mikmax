import defineStructure from '../utils/defineStructure'

export default defineStructure((S) =>
  S.listItem()
    .title('Área profesional B2B')
    .schemaType('b2bArea')
    .child(S.editor().title('Área profesional B2B').schemaType('b2bArea').documentId('b2bArea')),
)
