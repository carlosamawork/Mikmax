
import defineStructure from '../utils/defineStructure'
import {DocumentsIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'


export default defineStructure((S) =>
  S.listItem()
    .title('Posts')
    .icon(DocumentsIcon)
    .child(
      S.documentTypeList('post')
    )
);
