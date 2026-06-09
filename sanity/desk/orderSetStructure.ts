import defineStructure from '../utils/defineStructure'
import {StackCompactIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineStructure((S, context) =>
  S.listItem()
    .title('Ordenar Sets')
    .icon(StackCompactIcon)
    .child(() =>
      S.list()
        .title('Sets')
        .items([
          orderableDocumentListDeskItem({type: 'set', S: S as any, context: context as any}) as any,
        ]),
    ),
)
