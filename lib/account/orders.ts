import type {Customer, Order} from '@/types/account'

function formatMoney(money?: {amount: string; currencyCode: string} | null): string {
  if (!money) return ''
  const amount = Number(money.amount)
  try {
    return new Intl.NumberFormat('es-ES', {style: 'currency', currency: money.currencyCode}).format(
      amount,
    )
  } catch {
    return `${money.amount} ${money.currencyCode}`
  }
}

// Categoría = colección más específica (hija) del producto; si no hay hija, la
// primera colección; si no, el productType.
function resolveCategory(
  product:
    | {
        productType?: string | null
        collections?: {edges: {node: {handle?: string | null; title?: string | null}}[]} | null
      }
    | null
    | undefined,
  childHandles?: Set<string>,
): string | null {
  const cols = (product?.collections?.edges ?? []).map((e) => e.node)
  if (childHandles && childHandles.size) {
    const child = cols.find((c) => c.handle && childHandles.has(c.handle))
    if (child?.title) return child.title
  }
  return cols[0]?.title ?? product?.productType ?? null
}

export function mapOrders(
  customer: Customer | null | undefined,
  childHandles?: Set<string>,
): Order[] {
  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
  const edges = customer?.orders?.edges ?? []

  return edges.map(({node}) => {
    const addrName =
      node.shippingAddress?.name ||
      [node.shippingAddress?.firstName, node.shippingAddress?.lastName].filter(Boolean).join(' ')
    return {
      id: node.id,
      number: node.name || (node.orderNumber != null ? `#${node.orderNumber}` : ''),
      processedAt: node.processedAt || '',
      total: formatMoney(node.totalPrice),
      shipTo: addrName || customerName,
      financialStatus: node.financialStatus ?? null,
      statusUrl: node.statusUrl || '',
      lineItems: (node.lineItems?.edges ?? []).map(({node: li}) => ({
        title: li.title,
        quantity: li.quantity,
        category: resolveCategory(li.variant?.product, childHandles),
        handle: li.variant?.product?.handle ?? null,
        image: li.variant?.image
          ? {src: li.variant.image.src, altText: li.variant.image.altText ?? null}
          : null,
      })),
    }
  })
}
