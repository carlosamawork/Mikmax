import {StackCompactIcon} from '@sanity/icons'
import pluralize from 'pluralize-esm'
import {defineField} from 'sanity'
import OrderingComponent from '../../../components/inputs/OrderingComponent'
import OrderingProductComponent from '../../../components/inputs/OrderingProductComponent'

export default defineField({
    name: 'postOrdering',
    type: 'object',
    fields: [
      {
        name: 'orderedPosts',
        type: 'array',
        title: 'Ordered Posts',
        of: [{ type: 'reference', to: { type: 'post' } }],
        components: {
            input: OrderingComponent
        }
      },
    ]
})
