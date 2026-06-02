import defineStructure from '../utils/defineStructure'
import {StackIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineStructure((S, context) =>
  S.listItem()
    .title('Ordenar Looks')
    .icon(StackIcon)
    .child(() =>
      S.list()
        .title('Looks')
        .items([
          orderableDocumentListDeskItem({type: 'look', S: S as any, context: context as any}) as any,
        ]),
    ),
)
