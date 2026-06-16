import defineStructure from '../utils/defineStructure'
import {UsersIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Solicitudes B2B')
    .icon(UsersIcon)
    .schemaType('b2bApplication')
    .child(
      S.documentTypeList('b2bApplication')
        .title('Solicitudes B2B')
        .defaultOrdering([{field: 'createdAt', direction: 'desc'}]),
    ),
)
