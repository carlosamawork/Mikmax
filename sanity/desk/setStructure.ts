// sanity/desk/setStructure.ts
import defineStructure from '../utils/defineStructure'
import {StackCompactIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Sets')
    .icon(StackCompactIcon)
    .schemaType('set')
    .child(
      S.documentTypeList('set')
        .title('Sets')
        .defaultOrdering([{field: 'title', direction: 'asc'}]),
    ),
)
