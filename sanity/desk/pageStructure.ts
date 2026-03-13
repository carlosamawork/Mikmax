
import defineStructure from '../utils/defineStructure'
import {DocumentsIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Pages')
    .icon(DocumentsIcon)
    .schemaType('page')
    .child(S.documentTypeList('page'))
)
