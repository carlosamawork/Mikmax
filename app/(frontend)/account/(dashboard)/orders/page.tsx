import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getChildCollectionHandles} from '@/sanity/queries/common/collectionCategories'
import {mapOrders} from '@/lib/account/orders'
import {adminOrderGid, isReturnEligible} from '@/lib/account/returns'
// @ts-ignore — lib/shopify-admin.js no tiene tipos
import {getOrdersReturnStatus} from '@/lib/shopify-admin'
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

  const gidByOrderId = new Map(orders.map((o) => [o.id, adminOrderGid(o.id)]))
  const gids = Array.from(gidByOrderId.values()).filter((g): g is string => Boolean(g))
  const statusByGid: Record<string, string | null> = await getOrdersReturnStatus(gids)

  const ordersWithReturns = orders.map((order) => {
    const gid = gidByOrderId.get(order.id)
    const returnStatus = gid ? (statusByGid[gid] ?? null) : null
    return {
      ...order,
      returnStatus,
      returnEligible: isReturnEligible({...order, returnStatus}),
    }
  })

  return (
    <div className={s.list}>
      {ordersWithReturns.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}
