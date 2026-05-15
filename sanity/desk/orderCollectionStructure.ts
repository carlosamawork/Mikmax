import defineStructure from '../utils/defineStructure'
import {DocumentsIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineStructure((S, context) =>
  S.listItem()
    .title('Ordenar Colecciones')
    .icon(DocumentsIcon)
    .child(() =>
      S.list()
        .title('Colecciones')
        .items([
          orderableDocumentListDeskItem({
            type: 'collection',
            S: S as any,
            context: context as any,
          }) as any,
        ]),
    ),
)
