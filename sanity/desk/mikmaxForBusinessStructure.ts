
import defineStructure from '../utils/defineStructure'

export default defineStructure((S) =>
  S.listItem()
    .title('Mikmax for Business')
    .schemaType('mikmaxForBusiness')
    .child(
      S.editor()
        .title('Mikmax for Business')
        .schemaType('mikmaxForBusiness')
        .documentId('mikmaxForBusiness'),
    ),
)
