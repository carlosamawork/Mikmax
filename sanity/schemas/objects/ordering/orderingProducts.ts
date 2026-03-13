

import {StackCompactIcon} from '@sanity/icons'
import pluralize from 'pluralize-esm'
import {defineField} from 'sanity'
import OrderingProductComponent from '../../../components/inputs/OrderingProductComponent'

export default defineField({
    name: 'productOrdering',
    type: 'object',
    fields: [
        {
            name: 'orderedProducts',
            type: 'array',
            title: 'Ordered Products',
            of: [{ type: 'reference', to: { type: 'product' } }],
            components: {
                input: OrderingProductComponent
            }
        },
    ]
})