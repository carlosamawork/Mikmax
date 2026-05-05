// sanity/desk/lookStructure.ts
import defineStructure from '../utils/defineStructure'
import {StackIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Looks')
    .icon(StackIcon)
    .schemaType('look')
    .child(
      S.documentTypeList('look')
        .title('Looks')
        .defaultOrdering([{field: 'title', direction: 'asc'}]),
    ),
)
