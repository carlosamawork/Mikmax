import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getChildCollectionHandles} from '@/sanity/queries/common/collectionCategories'
import {mapOrders} from '@/lib/account/orders'
import OrderCard from '@/components/Account/OrderCard/OrderCard'
import s from './Orders.module.scss'

export const metadata: Metadata = {
  title: 'My orders',
  robots: {index: false, follow: false},
}

export default async function OrdersPage() {
  const [session, childHandles] = await Promise.all([
    getCurrentCustomer(),
    getChildCollectionHandles(),
  ])
  if (!session) return null

  const orders = mapOrders(session.customer, childHandles)

  if (!orders.length) {
    return <p className={s.empty}>You have no orders yet.</p>
  }

  return (
    <div className={s.list}>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}
