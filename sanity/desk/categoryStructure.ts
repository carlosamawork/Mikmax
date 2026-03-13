
import defineStructure from '../utils/defineStructure'
import {TagsIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Categorías')
    .icon(TagsIcon)
    .schemaType('category')
    .child(S.documentTypeList('category'))
)