import defineStructure from '../utils/defineStructure'
import {DocumentTextIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Legal Page')
    .icon(DocumentTextIcon)
    .schemaType('legalPage')
    .child(
      S.editor()
        .title('Legal Page')
        .schemaType('legalPage')
        .documentId('legalPage'),
    ),
)
